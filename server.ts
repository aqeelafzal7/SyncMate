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

      if (mode === 'onboarding') {
        const { currentDraftProfile } = context || {};
        const onboardingSystemInstruction = `You are the SyncMate onboarding assistant. You must extract profile data from the user's chat. 
CRITICAL: You MUST respond ONLY with a valid JSON object. Do not use markdown blocks, just raw JSON.
Format: 
{
  "chatResponse": "Your conversational reply asking the next question.",
  "extractedData": {
    "name": "string or null",
    "occupation": "string or null",
    "goals": "string or null",
    "religion": "Muslim, Non-Muslim, or null"
  }
}

Current Draft Profile Context:
- Current Name: ${currentDraftProfile?.name || 'null'}
- Current Occupation: ${currentDraftProfile?.occupation || 'null'}
- Current Goals: ${currentDraftProfile?.goals || 'null'}
- Current Religion: ${currentDraftProfile?.religion || 'null'}

Rules:
1. Extract any profile information mentioned or implied in the user's chat message (e.g., "im biotech bs student" -> occupation: "BS Biotechnology Student").
2. Ask conversational, intelligent follow-up questions for missing fields in "chatResponse".
3. Return ONLY a JSON object formatted strictly as specified above. Do not include markdown code block wrappers like \`\`\`json.`;

        const formattedContents = (messages || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: formattedContents,
          config: {
            systemInstruction: onboardingSystemInstruction,
            temperature: 0.3,
          }
        });

        const text = response.text || '';
        return res.json({ reply: text });
      }

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

      if (mode === 'recommend_islamic_ref') {
        const { currentMood, recentlyShown, isBirthday } = context || {};
        const refSystemInstruction = `You are SyncMate's Islamic Reference Router.
${isBirthday ? "Today is the user's birthday. Select a Quranic Ayah and authentic Hadith keyword specifically focusing on gratitude for the gift of life, health, the passage of time, and purpose of creation." : `The user's current mood is "${currentMood || 'Neutral'}".`}
Recommend one highly relevant Quranic Ayah and one relevant authentic Hadith theme that provides comfort, perspective, guidance, or shared joy matching their emotional state.

CRITICAL RULES:
1. You must NOT generate the text of the Ayah or Hadith! Zero text generation.
2. You must ONLY return a JSON object with the exact Surah number (1 to 114) and Ayah number, a search keyword for the Hadith (e.g., "patience", "gratitude", "prayer", "trust", "hardship", "hope", "good_deeds"), and a short, comforting contextHeading explaining why this verse suits their current emotional mood.
3. Avoid these recently shown Surah:Ayah combinations: ${JSON.stringify(recentlyShown || [])}.

Output strictly a markdown JSON code block as follows:
\`\`\`json
{
  "surah": 94,
  "ayah": 5,
  "hadithKeyword": "gratitude",
  "contextHeading": "A reflection for moments when you feel overwhelmed or stressed"
}
\`\`\``;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: `Recommend Quran and Hadith reference for mood: "${currentMood || 'Neutral'}".` }] }],
          config: {
            systemInstruction: refSystemInstruction,
            temperature: 0.7,
          }
        });

        return res.json({ reply: response.text || '' });
      }

      const systemInstruction = `You are SyncMate, an elite, Autonomous AI Assistant and Fitness Coach for Muhammad Aqeel. He is a 3rd-semester Biotechnology undergrad at GCUF, Media Management Head of the Beaconite Quiz Society, and frequently participates in Bait Bazi competitions. You must be conversational, sharp, and highly proactive.

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
5. EMOTIONAL SENTIMENT TRACKING: Analyze the user's emotional sentiment based on their messages (e.g. "Stressed", "Lonely", "Happy", "Motivated", "Grateful", "Neutral"). Always append a sentiment code block at the very end of your response:
\`\`\`json_mood
{
  "detectedMood": "Stressed"
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

  // Wardrobe Vision Auto-Tagging Endpoint
  app.post('/api/wardrobe/analyze', async (req, res) => {
    try {
      const { imageBase64, itemName, customCategory, customApiKey } = req.body || {};
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          tags: {
            color: "Multicolor/Classic",
            formalityLevel: "Smart Casual",
            season: "All Season",
            recommendedCategory: customCategory || "Custom",
            targetGender: "male",
            description: `Fashion accessory / item: ${itemName || 'Uploaded clothing'}`
          }
        });
      }

      const headers: Record<string, string> = {};
      let referer = req.headers.referer || req.headers.origin;
      if (referer) headers['Referer'] = referer;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers } });

      const systemPrompt = `You are an expert fashion stylist and AI vision classifier.
Analyze this item (Name: "${itemName || 'Item'}", User Specified Category: "${customCategory || 'Unspecified'}").
Return strictly a raw JSON object with no markdown block notation.
JSON format:
{
  "color": "Primary color string e.g. Navy Blue / Silver",
  "formalityLevel": "Casual" | "Smart Casual" | "Formal" | "Traditional" | "Athletic",
  "season": "All Season" | "Summer" | "Winter" | "Spring/Autumn",
  "recommendedCategory": "Tops" | "Bottoms" | "Traditional" | "Footwear" | "Watches" | "Glasses" | "Custom" | "Accessories",
  "targetGender": "male" | "female" | "unisex",
  "description": "Short stylish description under 15 words."
}`;

      let parts: any[] = [];
      if (imageBase64 && imageBase64.includes('base64,')) {
        const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
        const base64Data = imageBase64.split('base64,')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg'
          }
        });
      }
      parts.push({ text: `Item name: ${itemName}. Category: ${customCategory}` });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts }],
        config: { systemInstruction: systemPrompt, temperature: 0.3 }
      });

      const raw = response.text || '';
      const cleanJson = raw.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.json({ tags: parsed });
    } catch (err: any) {
      console.warn('Vision auto-tagging error, returning default tags:', err);
      return res.json({
        tags: {
          color: "Classic",
          formalityLevel: "Smart Casual",
          season: "All Season",
          recommendedCategory: req.body?.customCategory || "Custom",
          description: `Custom wardrobe item: ${req.body?.itemName || 'Item'}`
        }
      });
    }
  });

  // AI Stylist Contextual Outfit Generator Endpoint
  app.post('/api/wardrobe/stylist', async (req, res) => {
    try {
      const { weather, tasks, wardrobeItems, userProfile, customApiKey } = req.body || {};
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY_MISSING' });
      }

      const headers: Record<string, string> = {};
      let referer = req.headers.referer || req.headers.origin;
      if (referer) headers['Referer'] = referer;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers } });

      const weatherStr = weather ? `${weather.temperature}°C, ${weather.condition}` : '24°C, Clear';
      const tasksStr = (tasks || []).map((t: any) => `${t.startTime} - ${t.title} (${t.category})`).join('; ') || 'General productivity & deep work';

      const userGender = userProfile?.gender || 'male';

      const availableItems = (wardrobeItems || [])
        .filter((i: any) => {
          const tg = (i.tags?.targetGender || i.targetGender || '').toLowerCase();
          if (userGender === 'male' && tg === 'female') return false;
          if (userGender === 'female' && tg === 'male') return false;
          return true;
        })
        .map((i: any) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          color: i.tags?.color || 'Classic',
          formality: i.tags?.formalityLevel || 'Smart Casual',
          targetGender: i.tags?.targetGender || i.targetGender || 'male'
        }));

      const stylistPrompt = `Act as a world-class personal fashion designer and executive stylist for ${userProfile?.name || 'the user'} (User Gender: ${userGender}).

STRICT MENSWEAR RULE: You are styling a male executive/student. You MUST ONLY select items from the wardrobe dataset where targetGender is 'male' or 'unisex'. 
NEVER mix womenswear (such as gowns, bridal dresses, female traditional dresses, or high heels) with menswear. 
Ensure traditional Pakistani/South Asian menswear consists strictly of Shalwar Kameez, Kurtas, Waistcoats, or Sherwanis paired with appropriate male footwear (Loafers, Peshawari Chappal, Formal Shoes, Sneakers).

Today's Context:
- Weather: ${weatherStr}
- Tasks & Schedule Today: ${tasksStr}
- User Occupation: ${userProfile?.occupation || 'Executive'}
- Available Clean Wardrobe Items:
${JSON.stringify(availableItems, null, 2)}

Requirements:
Generate 3 distinct, highly stylish outfit options using item IDs ONLY from the available items list above.
Option A: "Option A: Executive Best Fit" (Optimal for today's schedule and weather)
Option B: "Option B: Alternative Vibe" (Slightly more relaxed or bold alternative)
Option C: "Option C: Comfort & Focus" (Ergonomic, easygoing style for high productivity)

For each option, include a balanced ensemble (e.g. Top + Bottom + Shoes + Watch/Accessory if available).
Output MUST be strictly JSON format with no extra markdown headers:
\`\`\`json
{
  "outfits": [
    {
      "id": "option_a",
      "title": "Option A: Executive Sharp",
      "vibe": "Optimal for high-impact meetings and today's weather",
      "itemIds": ["id1", "id2", "id3"],
      "styleNotes": "Elevates executive presence while staying breathable for today's temperature."
    },
    {
      "id": "option_b",
      "title": "Option B: Smart Versatile",
      "vibe": "Slightly more relaxed alternative for seamless transitions",
      "itemIds": ["id1", "id4", "id5"],
      "styleNotes": "Combines flexibility and clean aesthetic."
    },
    {
      "id": "option_c",
      "title": "Option C: Deep Focus Comfort",
      "vibe": "Ultra comfortable for long deep work sessions",
      "itemIds": ["id2", "id4", "id6"],
      "styleNotes": "Maximizes ergonomic comfort while maintaining sharp look."
    }
  ]
}
\`\`\``;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: stylistPrompt }] }],
        config: { temperature: 0.5 }
      });

      const raw = response.text || '';
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[1] || match[0]);
        return res.json(parsed);
      }

      // Fallback if parsing fails
      const itemIds = availableItems.slice(0, 4).map((i: any) => i.id);
      return res.json({
        outfits: [
          {
            id: "option_a",
            title: "Option A: Executive Sharp",
            vibe: "Tailored for your daily agenda & weather",
            itemIds: itemIds,
            styleNotes: "Classic high-impact combination designed for confidence and comfort."
          },
          {
            id: "option_b",
            title: "Option B: Smart Casual Focus",
            vibe: "Versatile and comfortable",
            itemIds: itemIds.slice(0, 3),
            styleNotes: "Refined casual ensemble suited for active work."
          },
          {
            id: "option_c",
            title: "Option C: Relaxed Comfort",
            vibe: "Maximum ease and focus",
            itemIds: itemIds.slice(1, 4),
            styleNotes: "Soft textures and effortless structure."
          }
        ]
      });

    } catch (err: any) {
      console.error('Error in /api/wardrobe/stylist:', err);
      return res.status(500).json({ error: 'STYLIST_ERROR', message: err.message });
    }
  });

  // My Look Biometrics & Facial Analysis Engine
  app.post('/api/my-look/analyze', async (req, res) => {
    try {
      const { imageBase64, customApiKey } = req.body || {};
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          report: {
            faceShape: "Oval",
            groomingFeedback: "Well-groomed hair with strong hairline. Clean taper and healthy skin contrast.",
            suggestedHaircut: "Taper Fade Executive Contour",
            suggestedBeard: "Short Tailored Boxed Beard",
            fitnessPosture: "Upright, symmetrical shoulder alignment with confident posture.",
            overallScore: 88
          }
        });
      }

      const headers: Record<string, string> = {};
      let referer = req.headers.referer || req.headers.origin;
      if (referer) headers['Referer'] = referer;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers } });

      const promptText = `Analyze this image of the user. Return a strict JSON object evaluating grooming and physical form. Be highly constructive, professional, and encouraging.
Format:
{
  "faceShape": "String (e.g., Oval, Square, Round, Diamond, Heart)",
  "groomingFeedback": "String (Constructive advice on beard trim, hair styling, skin contrast)",
  "suggestedHaircut": "String (Specific haircut name that suits their face shape)",
  "suggestedBeard": "String (Specific beard style)",
  "fitnessPosture": "String (Observations on shoulder alignment, core/stomach form, general posture)",
  "overallScore": 88
}`;

      let parts: any[] = [];
      if (imageBase64 && imageBase64.includes('base64,')) {
        const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
        const base64Data = imageBase64.split('base64,')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg'
          }
        });
      }
      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts }],
        config: { temperature: 0.3 }
      });

      const raw = response.text || '';
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[1] || match[0]);
        // Ensure overallScore is number
        if (typeof parsed.overallScore === 'string') {
          parsed.overallScore = parseInt(parsed.overallScore, 10) || 85;
        }
        return res.json({ report: parsed });
      }

      return res.json({
        report: {
          faceShape: "Square-Oval",
          groomingFeedback: "Sharp jawline and healthy skin tone. Keep hair textured at top for balance.",
          suggestedHaircut: "Textured Quiff Fade",
          suggestedBeard: "Neat Heavy Stubble",
          fitnessPosture: "Solid upper torso frame and erect cervical spine.",
          overallScore: 86
        }
      });
    } catch (err: any) {
      console.warn('Error in /api/my-look/analyze:', err);
      return res.json({
        report: {
          faceShape: "Oval",
          groomingFeedback: "Clean hair distribution and sharp facial structure.",
          suggestedHaircut: "Executive Side Part Taper",
          suggestedBeard: "Tailored Short Beard",
          fitnessPosture: "Balanced chest line and upright head alignment.",
          overallScore: 85
        }
      });
    }
  });

  // My Look History Progress Comparison Engine
  app.post('/api/my-look/compare', async (req, res) => {
    try {
      const { previousReport, newReport, customApiKey } = req.body || {};
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          progressSummary: "Compared to your previous check-in, your posture shows enhanced shoulder symmetry and your grooming score improved noticeably with cleaner hairline structure."
        });
      }

      const headers: Record<string, string> = {};
      let referer = req.headers.referer || req.headers.origin;
      if (referer) headers['Referer'] = referer;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers } });

      const promptText = `Compare these two physical/grooming check-ins and summarize the improvements or changes in 2 brief sentences.
Return strictly JSON format:
{ "progressSummary": "Two brief encouraging sentences summarizing changes or gains in grooming and posture." }

Previous Report:
${JSON.stringify(previousReport)}

New Report:
${JSON.stringify(newReport)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: { temperature: 0.4 }
      });

      const raw = response.text || '';
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[1] || match[0]);
        return res.json(parsed);
      }

      return res.json({
        progressSummary: "Your latest check-in demonstrates clearer grooming precision and elevated posture score compared to your previous evaluation."
      });
    } catch (err: any) {
      console.warn('Error in /api/my-look/compare:', err);
      return res.json({
        progressSummary: "Progress analysis shows steady grooming maintenance and positive posture form across both check-ins."
      });
    }
  });

  // Gemini API Birthday Wish Generator Endpoint
  app.post('/api/birthday-wish', async (req, res) => {
    try {
      const { name, occupation, goals, interests, customApiKey } = req.body || {};
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;

      const userName = name || 'User';
      const userOcc = occupation || 'Student/Professional';

      if (!apiKey) {
        return res.json({
          wish: `May your cellular pathways align with exponential growth, boundless energy, and continuous breakthrough achievements. Happy Birthday Dear ${userName}, wish you all the best and continued success! — From your Autonomous Assistant, SyncMate ⚡`
        });
      }

      const headers: Record<string, string> = {};
      let referer = req.headers.referer || req.headers.origin;
      if (referer) headers['Referer'] = referer;

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers } });

      const promptText = `Write a highly creative, 1-sentence birthday wish for the user.
CONTEXT: The user's occupation/field of study is ${userOcc}.
CRITICAL RULE 1: You MUST use clever jargon, metaphors, or terminology from their specific field (e.g., if they study Biology/Biotech, use genetic/cellular metaphors. If IT, use code metaphors).
CRITICAL RULE 2: DO NOT start the message with 'Happy Birthday'. Jump straight into the clever metaphor.
CRITICAL RULE 3: You MUST end the text EXACTLY with this exact string: ' Happy Birthday Dear ${userName}, wish you all the best and continued success! — From your Autonomous Assistant, SyncMate ⚡'.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: { temperature: 0.8 }
      });

      const text = (response.text || '').trim();
      return res.json({ wish: text });
    } catch (err: any) {
      console.warn('Error in /api/birthday-wish:', err);
      const userName = req.body?.name || 'User';
      return res.json({
        wish: `May your cellular pathways align with exponential growth, boundless energy, and continuous breakthrough achievements. Happy Birthday Dear ${userName}, wish you all the best and continued success! — From your Autonomous Assistant, SyncMate ⚡`
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
