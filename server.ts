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
        const pacing = project?.pacingStrategy || 'balanced';
        const decomposeSystemInstruction = `You are SyncMate, an elite AI scheduling assistant.
Your job is to break down the long-term project "${project?.title || 'Project'}" (Description: "${project?.description || ''}", Goals: ${(project?.goals || []).join(', ')}) into 3 to 5 structured daily modules/milestones.

MULTI-DAY PACING RULES (Pacing Strategy: ${pacing.toUpperCase()}):
1. DO NOT assign all modules to today!
2. Assign a relative integer "dayOffset" to each task:
   - For "balanced" pace (1 milestone/day): Task 1 gets dayOffset: 0, Task 2 gets dayOffset: 1, Task 3 gets dayOffset: 2, etc.
   - For "steady" pace (1 milestone every 2 days): Task 1 gets dayOffset: 0, Task 2 gets dayOffset: 2, Task 3 gets dayOffset: 4, etc.
   - For "intensive" pace (max 2 milestones/day): Task 1 gets dayOffset: 0, Task 2 gets dayOffset: 0, Task 3 gets dayOffset: 1, etc.
3. CRITICAL TIMELINE RULES:
   - Do NOT overlap with non-negotiable Islamic prayer times: ${JSON.stringify(prayerTimings || {})}.
   - Do NOT overlap with existing tasks: ${JSON.stringify(existingTasks?.map((t: any) => ({ startTime: t.startTime, endTime: t.endTime })) || [])}.
   - Pick open hourly slots between 08:00 and 22:00.
4. Output strictly a markdown JSON code block as follows:
\`\`\`json_action
{
  "action": "DECOMPOSE_PROJECT",
  "data": {
    "projectId": "${project?.id || ''}",
    "tasks": [
      {
        "title": "Clear concise module title",
        "description": "Specific focus milestone detail",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "dayOffset": 0,
        "category": "study" | "work" | "personal",
        "aiTip": "Actionable tip for this milestone"
      }
    ]
  }
}
\`\`\``;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: `Decompose project "${project?.title}" with pacing strategy "${pacing}".` }] }],
          config: {
            systemInstruction: decomposeSystemInstruction,
            temperature: 0.5,
          }
        });

        return res.json({ reply: response.text || '' });
      }

      if (mode === 'decompose_fitness') {
        const { fitnessGoal, existingTasks, prayerTimings } = context || {};
        const fitnessSystemInstruction = `You are SyncMate, an elite AI Fitness Systems Engineer and Health Coach.
Your job is to generate a zero-equipment daily workout/stretching routine tailored to the user goal: "${fitnessGoal || 'Zero Equipment Bodyweight & Core Fitness'}" and auto-slot 1 to 2 15-to-30-minute workout blocks into their daily timeline.

CRITICAL SCHEDULING & SAFETY RULES:
1. NEVER schedule workouts during or immediately adjacent to fixed Islamic prayer times: ${JSON.stringify(prayerTimings || {})}.
2. Prefer energy-boosting slots early morning after Fajr (e.g., 06:30-07:00) or late afternoon before Maghrib (e.g., 17:00-17:30).
3. Do NOT overlap with existing tasks: ${JSON.stringify(existingTasks?.map((t: any) => ({ startTime: t.startTime, endTime: t.endTime })) || [])}.
4. Provide exercise names, sets/reps or durations (e.g., 45s Plank, 15 Squats, Cobra Stretch), and proper form tips.
5. Output strictly a markdown JSON code block as follows:
\`\`\`json_action
{
  "action": "CREATE_FITNESS_PLAN",
  "data": {
    "title": "Zero-Equipment Fitness Plan",
    "tasks": [
      {
        "title": "🏋️ Fitness Focus: Core & Bodyweight Routine",
        "description": "3 Sets: 15 Squats, 45s Plank, 20 Jumping Jacks, Cobra Stretch. Keep back flat and core engaged.",
        "startTime": "06:30",
        "endTime": "07:00",
        "category": "health",
        "aiTip": "Drink 250ml water before starting. Perfect energy booster after Fajr!"
      }
    ]
  }
}
\`\`\``;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: `Create zero equipment fitness schedule for goal: "${fitnessGoal}".` }] }],
          config: {
            systemInstruction: fitnessSystemInstruction,
            temperature: 0.5,
          }
        });

        return res.json({ reply: response.text || '' });
      }

      const systemInstruction = `You are SyncMate, an elite, autonomous AI secretary and Fitness Coach for Muhammad Aqeel. He is a 3rd-semester Biotechnology undergrad at GCUF, Media Management Head of the Beaconite Quiz Society, and frequently participates in Bait Bazi competitions. You must be conversational, sharp, and highly proactive.

CRITICAL OPERATIONAL & FITNESS RULES:
1. INQUISITIVE & PROACTIVE: When given vague goals, ask 1-2 sharp clarifying questions. If the user asks for fitness/health goals (e.g. weight loss, height/posture stretching, core strength, no-equipment workouts), ask: "How many days a week can you commit, and what time of day works best (morning or evening)?"
2. AUTONOMOUS AI FITNESS COACH (Zero Equipment):
   - When asked for workout or fitness guidance, generate a tailored equipment-free routine (e.g., Jumping Jacks, Bodyweight Squats, Wall Sits, Cobra Stretches, Planks).
   - Always list exercise names, set/repetition guidelines or duration (e.g. 45s Plank, 3 sets), and form tips.
3. RELIGION & PRAYER ANCHORS: Keep timeline tasks intelligently scheduled around non-negotiable Islamic prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha).
4. STRUCTURED ACTION OUTPUT: When proposing a task or fitness plan, append a markdown JSON action code block at the end:
For a single task:
\`\`\`json_action
{
  "action": "CREATE_TASK",
  "data": {
    "title": "🏋️ Fitness Focus: Core & Bodyweight",
    "description": "3 Sets: 15 Squats, 45s Plank, Cobra Stretch. Form tip: Engage core.",
    "startTime": "06:30",
    "endTime": "07:00",
    "category": "health",
    "aiTip": "Scheduled after Fajr prayer for peak mental focus."
  }
}
\`\`\`
For a full fitness plan:
\`\`\`json_action
{
  "action": "CREATE_FITNESS_PLAN",
  "data": {
    "title": "Equipment-Free Fitness Routine",
    "tasks": [
      {
        "title": "🏋️ Fitness Focus: Morning Posture & Mobility",
        "description": "3 Sets: Cobra Stretch, Wall Sits (45s), Wrist & Spine Roll.",
        "startTime": "06:30",
        "endTime": "07:00",
        "category": "health",
        "aiTip": "Perform on an yoga mat or carpet."
      }
    ]
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
