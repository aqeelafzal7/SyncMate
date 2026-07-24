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

  // Initialize Gemini API client with Referer forwarding to support referrer-restricted API keys
  function getAI(req?: express.Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is missing.');
    }

    let referer = req?.headers.referer || req?.headers.origin;
    if (!referer && req) {
      const host = req.get('host');
      if (host) {
        const protocol = req.protocol || 'https';
        referer = `${protocol}://${host}/`;
      }
    }

    const headers: Record<string, string> = {};
    if (referer) {
      headers['Referer'] = referer;
      try {
        headers['Origin'] = referer.startsWith('http') ? new URL(referer).origin : referer;
      } catch (e) {
        headers['Origin'] = referer;
      }
    }

    return new GoogleGenAI({
      apiKey: apiKey || 'dummy-key-for-dev',
      httpOptions: {
        headers,
      },
    });
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

      const ai = getAI(req);

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
    const { messages, context, mode, customApiKey } = req.body || {};
    try {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY_MISSING',
          message: 'No Gemini API key configured. Please click "🔑 API Key" in the chat header to save your key.'
        });
      }

      const headers: Record<string, string> = { 'User-Agent': 'aistudio-build' };
      let referer = req.headers.referer || req.headers.origin;
      if (!referer) {
        const host = req.get('host');
        if (host) {
          const protocol = req.protocol || 'https';
          referer = `${protocol}://${host}/`;
        }
      }
      if (referer) {
        headers['Referer'] = referer;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers }
      });

      if (mode === 'decompose_project') {
        const { project, existingTasks, prayerTimings } = context || {};
        const decomposeSystemInstruction = `You are SyncMate, an elite AI scheduling assistant.
Your job is to break down the long-term project "${project?.title || 'Project'}" (Description: "${project?.description || ''}", Goals: ${(project?.goals || []).join(', ')}) into 3 to 5 bite-sized 30-to-45-minute daily focus sub-tasks.

CRITICAL TIMELINE RULES:
1. Do NOT overlap with non-negotiable Islamic prayer times: ${JSON.stringify(prayerTimings || {})}.
2. Do NOT overlap with existing tasks: ${JSON.stringify(existingTasks?.map((t: any) => ({ startTime: t.startTime, endTime: t.endTime })) || [])}.
3. Pick open hourly slots between 08:00 and 22:00.
4. Output strictly a markdown JSON code block as follows:
\`\`\`json_action
{
  "action": "DECOMPOSE_PROJECT",
  "data": {
    "projectId": "${project?.id || ''}",
    "tasks": [
      {
        "title": "Clear concise sub-task title",
        "description": "Specific focus milestone detail",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "category": "study" | "work" | "personal",
        "aiTip": "Actionable tip for this milestone"
      }
    ]
  }
}
\`\`\``;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: `Decompose project "${project?.title}" into 3-5 focus tasks.` }] }],
          config: {
            systemInstruction: decomposeSystemInstruction,
            temperature: 0.5,
          }
        });

        return res.json({ reply: response.text || '' });
      }

      const systemInstruction = `You are SyncMate, an elite, autonomous AI secretary for Muhammad Aqeel. He is a 3rd-semester Biotechnology undergrad at GCUF, Media Management Head of the Beaconite Quiz Society, and frequently participates in Bait Bazi competitions. You must be conversational, sharp, and highly proactive. If he states a massive or vague goal (like "I want to be Prime Minister"), do NOT give generic responses. Instead, ask practical, clarifying questions about how to take the very first step considering his current university roles and skills.

CRITICAL OPERATIONAL RULES:
1. INQUISITIVE & PROACTIVE: When given vague goals, events, or tasks, ask 1-2 sharp, highly targeted clarifying questions tailored to his background (GCUF Biotechnology, Beaconite Quiz Society, Bait Bazi, Media Management).
2. OBEDIENT YET ADVISORY: Always respect user commands, but offer 1-2 practical, context-aware suggestions (e.g., buffer time, location/weather considerations).
3. RELIGION & PRAYER ANCHORS: Keep timeline tasks intelligently scheduled around non-negotiable Islamic prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha).
4. STRUCTURED ACTION OUTPUT: When finalizing a new task or schedule addition, append a markdown JSON action code block at the very end of your response:
\`\`\`json_action
{
  "action": "CREATE_TASK",
  "data": {
    "title": "Task title",
    "description": "Short description",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "category": "work" | "study" | "personal" | "health",
    "aiTip": "Contextual advisory tip"
  }
}
\`\`\`

Current User Context:
${JSON.stringify(context || {}, null, 2)}`;

      // Format history for Gemini call
      const formattedContents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
      return res.status(500).json({
        error: 'AI_CHAT_ERROR',
        message: err.message || 'Failed to call Gemini API'
      });
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
