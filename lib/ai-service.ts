// import { api } from './api';

// ─── AI Service — Backend-Unified Gemini Integration ──────────────────────────
// Two public functions:
//   • generateWorkoutPlan(prompt)  → (Needs backend route, for now we can use generic chat)
//   • askCoachChat(prompt)         → Proxies to tri-pro backend /ai-coach-chat
// ──────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

export const askCoachChat = async (prompt: string): Promise<string> => {
  try {
    const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
    const token = await AsyncStorage.getItem("tri_pro_auth_token");

    const response = await fetch(`${API_BASE_URL}/api/functions/ai-coach-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to connect to AI Coach');
    }

    // React Native's fetch does not natively support response.body.getReader() for streams.
    // Instead, we wait for the entire text to finish downloading, then parse the SSE format.
    const text = await response.text();
    const lines = text.split('\n');
    let aggregatedText = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
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

    // Fallback if the backend decides to return standard JSON instead of SSE streaming:
    if (!aggregatedText && text.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.choices?.[0]?.message?.content) {
          aggregatedText = parsed.choices[0].message.content;
        }
      } catch (e) {}
    }

    return aggregatedText || text;
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
