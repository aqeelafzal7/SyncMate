import { getDecryptedApiKey } from './cryptoStorage';

export interface QuranAyahData {
  arabic: string;
  english: string;
  urdu: string;
  surahNameEn: string;
  surahNameAr: string;
  surahNum: number;
  ayahNumInSurah: number;
  ayahNumOverall: number;
}

export interface HadithData {
  arabic?: string;
  english: string;
  urdu: string;
  reference: string;
  book: string;
}

export interface EmotionalInsightResult {
  quran: QuranAyahData;
  hadith: HadithData;
  contextHeading: string;
  currentMood: string;
}

const FALLBACK_AYAHS: QuranAyahData[] = [
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    english: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
    urdu: 'پس تم مجھے یاد کرو، میں تمہیں یاد رکھوں گا، اور میرا شکر ادا کرو اور میری ناشکری نہ کرو۔',
    surahNameEn: 'Al-Baqarah',
    surahNameAr: 'سُورَةُ البَقَرَةِ',
    surahNum: 2,
    ayahNumInSurah: 152,
    ayahNumOverall: 159,
  },
  {
    arabic: 'وَأَقِمِ الصَّلَاةَ ۖ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
    english: 'And establish prayer. Indeed, prayer prohibits immorality and wrongdoing.',
    urdu: 'اور نماز قائم کرو، بے شک نماز بے حیائی اور برائی سے روکتی ہے۔',
    surahNameEn: 'Al-Ankabut',
    surahNameAr: 'سُورَةُ العَنكَبُوتِ',
    surahNum: 29,
    ayahNumInSurah: 45,
    ayahNumOverall: 3385,
  },
  {
    arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    english: 'Indeed, with hardship comes ease.',
    urdu: 'بے شک مشکل کے ساتھ آسانی ہے۔',
    surahNameEn: 'Ash-Sharh',
    surahNameAr: 'سُورَةُ الشَّرْحِ',
    surahNum: 94,
    ayahNumInSurah: 6,
    ayahNumOverall: 6096,
  },
  {
    arabic: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    english: 'Those who believe and whose hearts find rest in the remembrance of Allah. Unquestionably, by the remembrance of Allah do hearts find rest.',
    urdu: 'وہ لوگ جو ایمان لائے اور ان کے دل اللہ کے ذکر سے مطمئن ہوتے ہیں۔ سن لو! اللہ کے ذکر ہی سے دلوں کو اطمینان ملتا ہے۔',
    surahNameEn: 'Ar-Ra\'d',
    surahNameAr: 'سُورَةُ الرَّعْدِ',
    surahNum: 13,
    ayahNumInSurah: 28,
    ayahNumOverall: 1735,
  },
  {
    arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    english: 'And say: "My Lord, increase me in knowledge."',
    urdu: 'اور دعا کرو: "اے میرے رب! میرے علم میں اضافہ فرما۔"',
    surahNameEn: 'Taha',
    surahNameAr: 'سُورَةُ طه',
    surahNum: 20,
    ayahNumInSurah: 114,
    ayahNumOverall: 2462,
  },
];

const FALLBACK_HADITHS: HadithData[] = [
  {
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    english: 'The Prophet (ﷺ) said: "The best among you are those who learn the Qur\'an and teach it."',
    urdu: 'نبی اکرم صلی اللہ علیہ وسلم نے فرمایا: "تم میں سے بہترین وہ شخص ہے جو قرآن سیکھے اور سکھائے۔"',
    reference: 'Sahih al-Bukhari 5027',
    book: 'Sahih al-Bukhari',
  },
  {
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    english: 'The Messenger of Allah (ﷺ) said: "Actions are judged according to intentions, and every person will get what was intended."',
    urdu: 'رسول اللہ صلی اللہ علیہ وسلم نے فرمایا: "اعمال کا دارومدار نیتوں پر ہے اور ہر شخص کو وہی ملے گا جس کی اس نے نیت کی۔"',
    reference: 'Sahih al-Bukhari 1',
    book: 'Sahih al-Bukhari',
  },
  {
    arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ',
    english: 'The Prophet (ﷺ) said: "Whoever treads a path seeking knowledge, Allah will make easy for him a path to Paradise."',
    urdu: 'نبی کریم صلی اللہ علیہ وسلم نے فرمایا: "جو شخص علم کی تلاش میں کسی راستے پر چلتا ہے، اللہ تعالی اس کے لیے جنت کا راستہ آسان فرما دیتا ہے۔"',
    reference: 'Sahih Muslim 2699',
    book: 'Sahih Muslim',
  },
  {
    arabic: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    english: 'The Prophet (ﷺ) said: "None of you truly believes until he loves for his brother what he loves for himself."',
    urdu: 'نبی کریم صلی اللہ علیہ وسلم نے فرمایا: "تم میں سے کوئی شخص اس وقت تک کامل مومن نہیں ہو سکتا جب تک کہ وہ اپنے بھائی کے لیے وہی پسند نہ کرے جو اپنے لیے پسند کرتا ہے۔"',
    reference: 'Sahih al-Bukhari 13',
    book: 'Sahih al-Bukhari',
  },
  {
    arabic: 'الطُّهُورُ شَطْرُ الإِيمَانِ',
    english: 'The Messenger of Allah (ﷺ) said: "Purity is half of faith."',
    urdu: 'رسول اللہ صلی اللہ علیہ وسلم نے فرمایا: "پاکیزگی اور طہارت نصف ایمان ہے۔"',
    reference: 'Sahih Muslim 223',
    book: 'Sahih Muslim',
  },
];

/**
 * Get FIFO list of recently shown insights from localStorage (max 50)
 */
export function getRecentlyShownInsights(): string[] {
  try {
    const saved = localStorage.getItem('syncmate_recently_shown_insights');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Record a shown Ayah reference into localStorage (FIFO max 50 items)
 */
export function recordShownInsight(surah: number, ayah: number) {
  try {
    const key = `${surah}:${ayah}`;
    const saved = localStorage.getItem('syncmate_recently_shown_insights');
    let list: string[] = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(list)) list = [];

    // Filter out existing to avoid duplicates and push to end
    list = list.filter(item => item !== key);
    list.push(key);

    // Keep only last 50 items (FIFO)
    if (list.length > 50) {
      list = list.slice(list.length - 50);
    }

    localStorage.setItem('syncmate_recently_shown_insights', JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to record shown insight:', err);
  }
}

/**
 * Fetch specific authentic Ayah from Al Quran Cloud API using Surah & Ayah numbers
 */
export async function fetchSpecificAyah(surah: number, ayah: number): Promise<QuranAyahData> {
  const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,ur.jalandhry,en.asad`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const json = await res.json();
    if (json.code === 200 && Array.isArray(json.data) && json.data.length >= 3) {
      const arabicObj = json.data[0];
      const urduObj = json.data[1];
      const englishObj = json.data[2];

      return {
        arabic: arabicObj.text || '',
        urdu: urduObj.text || '',
        english: englishObj.text || '',
        surahNameEn: arabicObj.surah?.englishName || 'Surah',
        surahNameAr: arabicObj.surah?.name || '',
        surahNum: arabicObj.surah?.number || surah,
        ayahNumInSurah: arabicObj.numberInSurah || ayah,
        ayahNumOverall: arabicObj.number || 0,
      };
    } else {
      throw new Error('Invalid API response structure');
    }
  } catch (err) {
    console.warn(`Failed to fetch specific Ayah ${surah}:${ayah}, using fallback:`, err);
    // Return matching fallback or random fallback
    const matched = FALLBACK_AYAHS.find(a => a.surahNum === surah && a.ayahNumInSurah === ayah);
    return matched || FALLBACK_AYAHS[Math.floor(Math.random() * FALLBACK_AYAHS.length)];
  }
}

/**
 * Fetch Hadith matching keyword/theme from authentic Hadith sources
 */
export async function fetchHadithByTheme(keyword: string): Promise<HadithData> {
  const lowerKw = (keyword || '').toLowerCase();

  // Theme-mapped authentic Hadiths
  if (lowerKw.includes('patience') || lowerKw.includes('hardship') || lowerKw.includes('stress')) {
    return {
      arabic: 'عَجَبًا لأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ',
      english: 'The Messenger of Allah (ﷺ) said: "Strange is the affair of the believer, for all his affairs are good. If good times come to him, he expresses gratitude and it is good for him; and if hardship comes to him, he endures it patiently and it is good for him."',
      urdu: 'رسول اللہ صلی اللہ علیہ وسلم نے فرمایا: "مومن کا معاملہ عجیب ہے، اس کے تمام کاموں میں خیر ہی خیر ہے۔ اگر اسے خوشی ملے تو شکر کرتا ہے اور اگر تکلیف پہنچے تو صبر کرتا ہے اور یہ بھی اس کے لیے بہتر ہوتا ہے۔"',
      reference: 'Sahih Muslim 2999',
      book: 'Sahih Muslim',
    };
  }

  if (lowerKw.includes('gratitude') || lowerKw.includes('happy') || lowerKw.includes('thank')) {
    return {
      arabic: 'مَنْ لاَ يَشْكُرُ النَّاسَ لاَ يَشْكُرُ اللَّهَ',
      english: 'The Prophet (ﷺ) said: "He who does not thank people does not thank Allah."',
      urdu: 'نبی کریم صلی اللہ علیہ وسلم نے فرمایا: "جو لوگوں کا شکر ادا نہیں کرتا وہ اللہ تعالی کا شکر بھی ادا نہیں کرتا۔"',
      reference: 'Sunan Abi Dawud 4811',
      book: 'Sunan Abi Dawud',
    };
  }

  if (lowerKw.includes('trust') || lowerKw.includes('lonely') || lowerKw.includes('hope')) {
    return {
      arabic: 'لَوْ أَنَّكُمْ تَتَوَكَّلُونَ عَلَى اللَّهِ حَقَّ تَوَكُّلِهِ لَرَزَقَكُمْ كَمَا يَرْزُقُ الطَّيْرَ',
      english: 'The Messenger of Allah (ﷺ) said: "If you were to rely upon Allah with the reliance due to Him, He would provide for you just as He provides for the birds: they go out morning hungry and return evening full."',
      urdu: 'رسول اللہ صلی اللہ علیہ وسلم نے فرمایا: "اگر تم اللہ تعالی پر ویسا ہی توکل کرو جیسا کہ توکل کرنے کا حق ہے، تو وہ تمہیں ویسے ہی رزق دے گا جیسے پرندوں کو دیتا ہے جو صبح بھوکے نکلتے ہیں اور شام کو پیٹ بھر کر لوٹتے ہیں۔"',
      reference: 'Jami at-Tirmidhi 2344',
      book: 'Jami at-Tirmidhi',
    };
  }

  // Fallback to random authentic Hadith
  return FALLBACK_HADITHS[Math.floor(Math.random() * FALLBACK_HADITHS.length)];
}

/**
 * Main Emotional Reference Router Function:
 * Uses Gemini Reference Router (zero text generation, only Surah/Ayah numbers)
 * Then fetches authentic Quran & Hadith text from verified APIs.
 */
export async function getEmotionalIslamicInsight(
  currentMood?: string,
  customApiKey?: string,
  isBirthday?: boolean
): Promise<EmotionalInsightResult> {
  const activeMood = currentMood || localStorage.getItem('syncmate_current_mood') || 'Neutral';
  const recentlyShown = getRecentlyShownInsights();
  const activeApiKey = customApiKey || (await getDecryptedApiKey()) || '';

  let replyText = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'recommend_islamic_ref',
        customApiKey: activeApiKey,
        context: {
          currentMood: activeMood,
          recentlyShown,
          isBirthday: Boolean(isBirthday)
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      replyText = data.reply || '';
    } else {
      throw new Error(`Server returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('Emotional Reference Router API call failed, attempting direct Gemini REST API:', err);

    if (activeApiKey) {
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`;
        const refSystemInstruction = `You are SyncMate's Islamic Reference Router.
${isBirthday ? "Today is the user's birthday. Select a Quranic Ayah and authentic Hadith keyword specifically focusing on gratitude for the gift of life, health, the passage of time, and purpose of creation." : `The user's current mood is "${activeMood}".`}
Recommend one highly relevant Quranic Ayah and one relevant authentic Hadith theme that provides comfort, perspective, guidance, or shared joy matching their emotional state.

CRITICAL RULES:
1. You must NOT generate the text of the Ayah or Hadith! Zero text generation.
2. You must ONLY return a JSON object with the exact Surah number (1 to 114) and Ayah number, a search keyword for the Hadith (e.g., "patience", "gratitude", "prayer", "trust", "hardship", "hope", "good_deeds"), and a short, comforting contextHeading explaining why this verse suits their current emotional mood.
3. Avoid these recently shown Surah:Ayah combinations: ${JSON.stringify(recentlyShown)}.

Output strictly a markdown JSON code block as follows:
\`\`\`json
{
  "surah": 94,
  "ayah": 5,
  "hadithKeyword": "gratitude",
  "contextHeading": "A reflection for moments when you feel overwhelmed or stressed"
}
\`\`\``;

        const directRes = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Recommend Quran and Hadith reference for mood: "${activeMood}".` }] }],
            systemInstruction: { parts: [{ text: refSystemInstruction }] }
          })
        });

        if (directRes.ok) {
          const directData = await directRes.json();
          replyText = directData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (directErr) {
        console.warn('Direct Gemini REST call failed for Islamic reference:', directErr);
      }
    }
  }

  if (replyText) {
    // Extract JSON block from Reference Router response
    const jsonMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/) || replyText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const rawJsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(rawJsonStr);

        const surah = Number(parsed.surah);
        const ayah = Number(parsed.ayah);
        const hadithKeyword = parsed.hadithKeyword || 'patience';
        const contextHeading = parsed.contextHeading || `A reflection tailored for moments of ${activeMood.toLowerCase()}...`;

        if (surah >= 1 && surah <= 114 && ayah >= 1) {
          // Fetch authentic text using Surah:Ayah numbers from Al Quran Cloud API
          const quranData = await fetchSpecificAyah(surah, ayah);
          
          // Save shown reference into localStorage FIFO memory
          recordShownInsight(surah, ayah);

          // Fetch authentic Hadith matching theme
          const hadithData = await fetchHadithByTheme(hadithKeyword);

          return {
            quran: quranData,
            hadith: hadithData,
            contextHeading,
            currentMood: activeMood
          };
        }
      } catch (e) {
        console.warn('Failed to parse reference router JSON:', e);
      }
    }
  }

  // Fallback to authentic fallback Ayah & Hadith
  const defaultSurahMap: Record<string, { surah: number; ayah: number; heading: string }> = {
    Stressed: { surah: 94, ayah: 6, heading: 'A timeless comfort for moments of hardship and stress' },
    Lonely: { surah: 13, ayah: 28, heading: 'A peaceful reminder that Allah is always near' },
    Happy: { surah: 2, ayah: 152, heading: 'A reflection for gratitude and joy' },
    Motivated: { surah: 20, ayah: 114, heading: 'A verse for focus, growth, and wisdom' },
    Grateful: { surah: 2, ayah: 152, heading: 'A reflection for heart-filled gratitude' },
    Neutral: { surah: 29, ayah: 45, heading: 'A reflection on the tranquility of prayer' },
  };

  const selectedRef = defaultSurahMap[activeMood] || defaultSurahMap['Neutral'];
  const quranData = await fetchSpecificAyah(selectedRef.surah, selectedRef.ayah);
  recordShownInsight(selectedRef.surah, selectedRef.ayah);
  const hadithData = await fetchHadithByTheme(activeMood);

  return {
    quran: quranData,
    hadith: hadithData,
    contextHeading: selectedRef.heading,
    currentMood: activeMood
  };
}
