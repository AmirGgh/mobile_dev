// import { api } from './api';

// ─── AI Service — Backend-Unified Gemini Integration ──────────────────────────
// Two public functions:
//   • generateWorkoutPlan(prompt)  → (Needs backend route, for now we can use generic chat)
//   • askCoachChat(prompt)         → Proxies to tri-pro backend /ai-coach-chat
// ──────────────────────────────────────────────────────────────────────────────

export const askCoachChat = async (prompt: string): Promise<string> => {
  try {
    // The tri-pro backend expects a "messages" array
    // Note: The backend uses SSE. For simplicity in the mobile app, 
    // we will fetch the full response if possible, or handle the stream.
    // However, since askCoachChat is expected to return a string, 
    // we'll implement a non-streaming fetch if the backend supports it, 
    // or just aggregate the stream.
    
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/functions/ai-coach-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real app, you'd add the Auth token here. 
        // Our api client handles this in its request() method, but for fetch we need to do it manually.
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to connect to AI Coach');
    }

    // Since the backend returns an SSE stream, we need to parse it.
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let aggregatedText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              aggregatedText += content;
            }
          } catch {
            // Partial JSON or empty data
          }
        }
      }
    }

    return aggregatedText;
  } catch (error: any) {
    console.error('[ai-service] Error calling backend AI:', error);
    throw new Error(error?.message ?? 'שגיאה בתקשורת עם המאמן');
  }
};

export const generateWorkoutPlan = async (prompt: string): Promise<string> => {
  // For now, we use the same chat endpoint but with a specialized prompt.
  // Ideally, the tri-pro backend should have a dedicated /generate-workout-plan route.
  const structuredPrompt = `
Generate a workout plan in JSON format based on this request: ${prompt}.
The JSON must be an array of objects with: title, description, date, type, subgroup_name.
`;
  return askCoachChat(structuredPrompt);
};
