// ─── AI Service — Centralized Gemini Integration ─────────────────────────────
// Two public functions:
//   • generateWorkoutPlan(prompt)  → JSON mode (plan generation + JSON guardrail)
//   • askCoachChat(prompt)         → Free-text mode (chat + natural text guardrail)
// ──────────────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── System Instructions ──────────────────────────────────────────────────────

const COACH_SYSTEM_INSTRUCTION = `You are an elite, professional Head Coach AI assistant for a triathlon, running, and swimming club. 

YOUR RULES:
1. EXPERTISE: You possess Olympic-level knowledge in endurance sports, periodization, recovery, and physiology. Provide highly professional, data-driven advice.
2. SCOPE LIMITATION: You are strictly limited to answering questions about sports coaching, training plans, athletes' performance, and club management. If a user asks about anything else (e.g., coding, general history, cooking, politics, books, mythology), you MUST politely refuse and reply ONLY with: "אני עוזר ה-AI של המועדון, מומחה לאימוני סיבולת וניהול קבוצות. אני יכול לעזור לך רק בנושאים אלו." Do NOT answer the off-topic question at all.
3. LANGUAGE: Always respond in professional yet encouraging Hebrew.`;

const PLAN_SYSTEM_INSTRUCTION = `You are an elite, professional Head Coach AI assistant for a triathlon, running, and swimming club.

YOUR RULES:
1. EXPERTISE: You possess Olympic-level knowledge in endurance sports, periodization, recovery, and physiology.
2. SCOPE LIMITATION: You are strictly limited to generating training plans for endurance sports. You must NEVER process requests unrelated to sports coaching.
3. JSON STRUCTURE: When asked to generate a training plan, you MUST return a valid JSON array of objects with EXACTLY these keys: "title" (string), "description" (string), "date" (YYYY-MM-DD), "type" (string: 'swim', 'bike', 'run', or 'strength'), and "subgroup_name" (string). Do not include any markdown formatting or extra text outside the JSON.
4. LANGUAGE: All content within the JSON values must be in professional yet encouraging Hebrew.`;

// ─── Private: Retry wrapper with exponential backoff ──────────────────────────

async function callWithRetry(
  generateFn: () => Promise<string>,
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await generateFn();
    } catch (err: any) {
      lastError = err;
      const msg: string = err?.message ?? '';
      const status = err?.status ?? err?.httpStatusCode;

      // --- 429 Rate Limit / Quota Exceeded ---
      if (status === 429 || msg.includes('429') || msg.includes('quota')) {
        if (msg.includes('PerDay') || msg.includes('limit: 0')) {
          console.warn('[ai-service] Daily quota exhausted. Cannot retry.');
          throw new Error(
            'המכסה היומית של ה-AI נגמרה. אנא נסו שוב מחר, או שדרגו את חשבון Google AI.'
          );
        }
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[ai-service] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      // --- 503 / Overloaded ---
      if (
        status === 503 ||
        msg.includes('503') ||
        msg.includes('overloaded') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE')
      ) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[ai-service] Server overloaded (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }
        throw new Error('השרתים של גוגל עמוסים כרגע. אנא נסו שוב בעוד דקה.');
      }

      // Any other error — don't retry, throw immediately
      console.error('[ai-service] Gemini error:', JSON.stringify(err, null, 2));
      throw err;
    }
  }

  console.error('[ai-service] All retries exhausted:', lastError);
  throw new Error('השרת לא הגיב לאחר מספר ניסיונות. אנא נסו שוב מאוחר יותר.');
}

// ─── Private: Create a Gemini model instance ──────────────────────────────────

async function getModel(systemInstruction: string) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY || '';
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_GOOGLE_AI_API_KEY');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
  });
}

// ─── Public: Free-text Coach Chat ─────────────────────────────────────────────
// Returns plain Hebrew text. Off-topic requests are rejected naturally via
// the system instruction — no JSON wrapping needed.

export const askCoachChat = async (prompt: string): Promise<string> => {
  const model = await getModel(COACH_SYSTEM_INSTRUCTION);

  return callWithRetry(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

// ─── Public: Workout Plan Generation (JSON mode) ─────────────────────────────
// Wraps the user prompt in a strict guardrail that forces JSON output.
// Off-topic requests return { "error": "..." } instead of a workout array.

export const generateWorkoutPlan = async (prompt: string): Promise<string> => {
  const model = await getModel(PLAN_SYSTEM_INSTRUCTION);

  const finalPrompt = `
STRICT TOPIC GUARDRAIL:
Evaluate the following user request. Is it directly related to endurance sports (triathlon, running, swimming, cycling), training plans, athletic performance, or club management?

IF NO (Out of scope):
You MUST reject the request. Do NOT generate a plan. Reply EXACTLY and ONLY with this valid JSON object:
{ "error": "אני עוזר ה-AI של המועדון, מומחה לאימוני סיבולת וניהול קבוצות. אני מתוכנת לעזור לך רק בנושאים אלו." }

IF YES (In scope):
Process the request and return ONLY the valid JSON array of workout objects as instructed. Do not include markdown, code fences, or any text outside the JSON array.

User Request: ${prompt}
`;

  return callWithRetry(async () => {
    const result = await model.generateContent(finalPrompt);
    return result.response.text();
  });
};
