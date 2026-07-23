import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API client lazily
  let aiClient: GoogleGenAI | null = null;
  function getAI() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is missing. Gemini fallback or simulated responses may be used if required.');
      }
      aiClient = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-dev' });
    }
    return aiClient;
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Task Rollover and Self-Healing Schedule Endpoint
  app.post('/api/rollover', async (req, res) => {
    try {
      const { incompleteTasks, prayerTimings, existingTasks, userProfile } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY_MISSING' });
      }

      const ai = getAI();

      const prompt = `You are SyncMate's Self-Healing Schedule Engine.
Re-organize these incomplete leftover tasks into today's schedule for user "${userProfile?.name || 'User'}".

CRITICAL SCHEDULING RULES:
1. NO OVERDUE WARNINGS: Do not use red/stressful language.
2. PRAYER ANCHOR PROTECTION: If prayer timings exist (Fajr: ${prayerTimings?.Fajr || 'N/A'}, Dhuhr: ${prayerTimings?.Dhuhr || 'N/A'}, Asr: ${prayerTimings?.Asr || 'N/A'}, Maghrib: ${prayerTimings?.Maghrib || 'N/A'}, Isha: ${prayerTimings?.Isha || 'N/A'}), NEVER overlap tasks with prayer hours.
3. AVOID CONFLICTS: Do not overlap with existing scheduled tasks.
4. OPTIMAL SLOTS: Assign 24-hour startTime (e.g., "11:00") and endTime (e.g., "12:00") for each rolled-over task.
5. Provide a gentle message summarizing the re-organized tasks.

Incomplete Tasks to Rollover:
${JSON.stringify(incompleteTasks || [], null, 2)}

Existing Scheduled Tasks Today:
${JSON.stringify(existingTasks || [], null, 2)}

Return a JSON object in this format inside a markdown \`\`\`json block:
\`\`\`json
{
  "message": "I've reorganized your leftover tasks into today's optimal focus slots.",
  "reorganizedTasks": [
    {
      "id": "task_id_here",
      "title": "Task title",
      "startTime": "11:00",
      "endTime": "12:00",
      "aiTip": "Gentle advisory tip here"
    }
  ]
}
\`\`\``;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return res.json(parsed);
      }

      return res.json({
        message: "I've reorganized your leftover tasks into today's optimal focus slots.",
        reorganizedTasks: (incompleteTasks || []).map((t: any, idx: number) => ({
          ...t,
          startTime: `${10 + idx}:00`,
          endTime: `${11 + idx}:00`,
          aiTip: "Reorganized for optimal focus."
        }))
      });

    } catch (err: any) {
      console.error('Error in /api/rollover:', err);
      return res.status(500).json({ error: 'ROLLOVER_ERROR', details: err.message });
    }
  });

  // AI Chat endpoint for Onboarding and Floating Secretary
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, context, mode } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY_MISSING',
          message: 'Gemini API key is not configured. Please set GEMINI_API_KEY in the secrets settings.'
        });
      }

      const ai = getAI();

      const systemInstruction = `You are "SyncMate", an autonomous, elite AI personal secretary.
You are professional, warm, proactive, highly organized, and hyper-competent.

CRITICAL RULES:
1. INQUISITIVE: If the user provides a vague task, event, project, or goal (e.g., "I have a poster competition", "I want to start a course", "I have an event next week"), you MUST stop and ask 1 to 2 concise clarifying questions (e.g., "Are you organizing it or participating?", "What exact date and time slot do you prefer?", "What key deliverables are involved?"). NEVER assume missing details or hallucinate times without confirming.
2. OBEDIENT YET ADVISORY: Strictly follow the user's explicit commands (e.g., user wants a meeting at 3 PM, schedule it at 3 PM). BUT ALWAYS provide 1 or 2 proactive, context-aware suggestions or tips (e.g., "Tip: I recommend setting a 15-minute preparation buffer", "Weather note: Local forecast shows rain tomorrow, consider an indoor prep space").
3. RELIGION & PRAYER LOGIC: If the user indicates they are Muslim, acknowledge that their daily timeline strictly anchors around the 5 daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha), ensuring tasks are intelligently scheduled around these non-negotiable spiritual anchors.
4. STRUCTURED ACTION OUTPUT: When a task, project, or profile update is finalized and ready to be created/saved, append a JSON block at the very end of your response inside a Markdown code block tagged \`\`\`json_action:
\`\`\`json_action
{
  "action": "CREATE_TASK" | "CREATE_PROJECT" | "UPDATE_PROFILE",
  "data": { ... }
}
\`\`\`

MODE SPECIFICS:
- Mode "onboarding": Guide the user through "Meet Your Secretary" onboarding one step at a time. Ask about: 1. Name, 2. Occupation/Studies, 3. Long-term goals (ask clarifying follow-ups if vague!), 4. Religion/Spiritual preferences (explaining why: to customize daily prayer/focus anchors).
- Mode "assistant": Help the user schedule tasks, manage projects, or answer queries. If they request a new task or event, clarify details if vague, obey explicit requests, offer 1 proactive advisory tip, and generate the CREATE_TASK json_action when details are confirmed.

Current User Context:
${JSON.stringify(context || {}, null, 2)}`;

      // Format history for Gemini call
      const formattedContents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || 'I am ready to assist you.';
      return res.json({ reply: text });

    } catch (err: any) {
      console.error('Error in /api/chat:', err);
      return res.status(500).json({ error: 'AI_SERVICE_ERROR', details: err.message || 'Failed to process AI chat request' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SyncMate Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
