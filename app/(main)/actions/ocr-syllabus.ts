"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ocr-syllabus.ts
export interface ParsedSyllabus {
    examName: string | null;
    categoryNumber: string | null;
    description: string | null;
    duration: number | null;       // in minutes
    totalMarks: number | null;
    tags: string[];
    syllabus: { category: string; topics: string[] }[];
}

// Pass 1 — understand the document structure before extracting
async function detectDocumentStructure(
    model: any,
    base64Content: string,
    mimeType: string
): Promise<"structured" | "prose" | "tabular"> {

    const result = await model.generateContent([
        { inlineData: { data: base64Content, mimeType } },
        {
            text: `Analyze this syllabus document and classify its format.

Reply with ONLY one of these three words, nothing else:
- "structured" → clearly numbered sections with bullet-point topics (e.g. "1. MECHANICS\\n- Rigid bodies\\n- Torque")  
- "tabular" → has a marks distribution table at the start, then prose descriptions per section
- "prose" → topics described in flowing paragraphs, no clear bullet structure

Which format is this document?` }
    ]);

    const format = result.response.text().trim().toLowerCase();
    if (format.includes("tabular")) return "tabular";
    if (format.includes("prose")) return "prose";
    return "structured";
}

const STRUCTURED_PROMPT = `
You are extracting structured data from an exam syllabus document.
You have access to Google Search — use it when information is missing from the document.

━━━ EXAM IDENTITY ━━━

EXAM NAME:
- Extract the clean post/job title only.
- If multiple posts share this syllabus, separate them with " ||| "
  Example: "SYLLABUS FOR ASSISTANT ENGINEER (CIVIL) AND JUNIOR ENGINEER (CIVIL)"
  → "Assistant Engineer Civil ||| Junior Engineer Civil"
- "SYLLABUS FOR THE POST OF RANGE FOREST OFFICER IN KERALA FOREST & WILDLIFE DEPARTMENT"
  → "Range Forest Officer"
- Strip all boilerplate: "SYLLABUS FOR THE POST OF", department names, "KPSC", "Syllabus" etc.

CATEGORY NUMBER:
- Look for any code like "Cat. No.", "Category No.", "277/2024", "PHY" anywhere in document.
- If not found, search Google: "[exam name] KPSC category number [year if known]"
- If multiple category numbers found, join with " ; "
  Example: "(Cat.Nos. 433/2023, 434/2023)" → return "433/2023 ; 434/2023"
- Only use results from keralapsc.gov.in or official notifications.
- Return null if not found after searching.

━━━ SYLLABUS EXTRACTION ━━━

- Each numbered section → separate category object.
- Strip number prefix: "1. MECHANICS" → "MECHANICS"
- Use "Parent > Child" for nested topics.
- Preserve exact topic names.
- Exclude page numbers, marks, weightage.

━━━ OUTPUT (JSON only, no markdown) ━━━
After extracting the syllabus, use Google Search to find:
1. A brief 1-2 sentence description of what this exam is for and who conducts it.
   Search: "[exam name] official notification"
2. Exam duration in minutes (e.g. 180 for a 3-hour exam).
   Search: "[exam name] exam duration total marks"
3. Total marks.
4. 3-6 relevant lowercase tags (e.g. "kerala-psc", "forestry", "degree-level", "physics").

{
  "examName": "Range Forest Officer",
  "categoryNumber": "277/2024" or null,
  "description": "Recruitment exam conducted by Kerala PSC for the post of Range Forest Officer in Kerala Forest & Wildlife Department. Tests optional subject Physics along with general knowledge.",
  "duration": 120,
  "totalMarks": 100,
  "tags": ["kerala-psc", "forestry", "physics", "degree-level"],
  "syllabus": [
    {
      "category": "MECHANICS",
      "topics": [
        "Rigid Body Dynamics > Moment of Inertia",
        "Conservation of Energy > Work-Energy Theorem"
      ]
    }
  ]
}`;

const TABULAR_PROMPT = `
You are extracting structured data from an exam syllabus document.
This document has a marks distribution table followed by detailed prose descriptions.
You have access to Google Search — use it when information is missing.

━━━ EXAM IDENTITY ━━━

EXAM NAME:
- Extract the clean post/job title only.
- If multiple posts share this syllabus, separate them with " ||| "
  Example: "SYLLABUS FOR ASSISTANT ENGINEER (CIVIL) AND JUNIOR ENGINEER (CIVIL)"
  → "Assistant Engineer Civil ||| Junior Engineer Civil"
- "SYLLABUS FOR THE POST OF RANGE FOREST OFFICER IN KERALA FOREST & WILDLIFE DEPARTMENT"
  → "Range Forest Officer"
- Strip all boilerplate: "DETAILED SYLLABUS", "MARK DISTRIBUTION", "FOR THE MAIN EXAMINATION OF", organization names.

CATEGORY NUMBER:
- Look for "Cat.Nos.", "Cat. No.", "Category No." — often in the header or subtitle.
  Example: "(Cat.Nos. 433/2023, 434/2023)" → return "433/2023 ; 434/2023"
- If multiple category numbers found, join with " ; "
- If not found, search Google: "[exam name] KPSC category number"
- Return null if not found after searching.

━━━ SYLLABUS EXTRACTION ━━━

This document has two parts:
1. A marks table (e.g. "I. General Knowledge ... 39 marks")
2. Detailed content per section

Use the DETAILED CONTENT section for topics, not the marks table.

CATEGORY RULES:
- Top-level roman numeral sections → categories (e.g. "I. GENERAL KNOWLEDGE" → "GENERAL KNOWLEDGE")
- Sub-sections within each category → use "Parent > Child" syntax
  Example under GENERAL KNOWLEDGE:
  "(i) History" with topics → "History > Kerala - Arrival of Europeans"
  "(ii) Geography" with topics → "Geography > Basics of Geography"
- Each distinct topic or concept = one entry in the topics array
- For prose paragraphs: extract individual named topics, don't copy the whole paragraph
  Bad:  "KERALA - Arrival of Europeans-Contributions of Europeans-History of Travancore..."
  Good: "History > Kerala - Arrival of Europeans"
        "History > History of Travancore"
        "History > Social and Religious Reform Movement"

━━━ OUTPUT (JSON only, no markdown) ━━━
After extracting the syllabus, use Google Search to find:
1. A brief 1-2 sentence description of what this exam is for and who conducts it.
   Search: "[exam name] official notification"
2. Exam duration in minutes (e.g. 180 for a 3-hour exam).
   Search: "[exam name] exam duration total marks"
3. Total marks.
4. 3-6 relevant lowercase tags (e.g. "kerala-psc", "forestry", "degree-level", "physics").
{
  "examName": "Assistant Manager",
  "categoryNumber": "433/2023 ; 434/2023",
  "description": "Recruitment exam conducted by Kerala PSC for the post of Range Forest Officer in Kerala Forest & Wildlife Department. Tests optional subject Physics along with general knowledge.",
  "duration": 120,
  "totalMarks": 100,
  "tags": ["kerala-psc", "forestry", "physics", "degree-level"],
  "syllabus": [
    {
      "category": "GENERAL KNOWLEDGE",
      "topics": [
        "History > Kerala - Arrival of Europeans",
        "History > National Movement in Kerala",
        "Geography > Earth Structure",
        "Economics > Five Year Plans"
      ]
    },
    {
      "category": "CURRENT AFFAIRS",
      "topics": ["Current Affairs"]
    }
  ]
}`;

const PROSE_PROMPT = `
You are extracting structured data from an exam syllabus document.
This document describes topics in flowing prose without clear bullet structure.
You have access to Google Search — use it when information is missing.

━━━ EXAM IDENTITY ━━━

EXAM NAME:
- Extract the clean post/job title only.
- If multiple posts share this syllabus, separate them with " ||| "
  Example: "SYLLABUS FOR ASSISTANT ENGINEER (CIVIL) AND JUNIOR ENGINEER (CIVIL)"
  → "Assistant Engineer Civil ||| Junior Engineer Civil"
- "SYLLABUS FOR THE POST OF RANGE FOREST OFFICER IN KERALA FOREST & WILDLIFE DEPARTMENT"
  → "Range Forest Officer"
- Strip all boilerplate: "SYLLABUS FOR THE POST OF", department names, "KPSC", "Syllabus" etc.

CATEGORY NUMBER:
- Look for any subject/category code in the document.
- If not found, search Google: "[exam name] category number official"
- If multiple category numbers found, join with " ; "
  Example: "(Cat.Nos. 433/2023, 434/2023)" → return "433/2023 ; 434/2023"
- Return null if not found.

━━━ SYLLABUS EXTRACTION ━━━

- Identify logical subject groupings from the prose.
- Each grouping becomes a category.
- Extract individual named concepts/topics from the prose.
- Use "Parent > Child" for clearly nested concepts.
- Don't copy entire sentences — extract topic names only.

━━━ OUTPUT (JSON only, no markdown) ━━━
1. A brief 1-2 sentence description of what this exam is for and who conducts it.
   Search: "[exam name] official notification"
2. Exam duration in minutes (e.g. 180 for a 3-hour exam).
   Search: "[exam name] exam duration total marks"
3. Total marks.
4. 3-6 relevant lowercase tags (e.g. "kerala-psc", "forestry", "degree-level", "physics").

{
  "examName": "...",
  "categoryNumber": "..." or null,
  "description": "Recruitment exam conducted by Kerala PSC for the post of Range Forest Officer in Kerala Forest & Wildlife Department. Tests optional subject Physics along with general knowledge.",
  "duration": 120,
  "totalMarks": 100,
  "tags": ["kerala-psc", "forestry", "physics", "degree-level"],
  "syllabus": [
    { "category": "...", "topics": ["..."] }
  ]
}`;

export async function parseSyllabusPDF(
    base64Data: string
): Promise<{ success: true; data: ParsedSyllabus } | { success: false; error: string }> {

    if (!process.env.GEMINI_API_KEY)
    {
        return { success: false, error: "GEMINI_API_KEY is not configured" };
    }

    const base64Content = base64Data.split(",")[1];
    if (!base64Content)
    {
        return { success: false, error: "Invalid base64 data" };
    }

    const mimeType = base64Data.split(";")[0].split(":")[1] as
        "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

    // Detection model — no search needed
    const detectionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Extraction model — with search
    const extractionModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} } as any],
    });

    try
    {
        // Pass 1 — detect format
        const format = await detectDocumentStructure(detectionModel, base64Content, mimeType);
        console.log(`Detected format: ${format}`);

        // Pass 2 — extract with format-specific prompt
        const prompt = format === "tabular"
            ? TABULAR_PROMPT
            : format === "prose"
                ? PROSE_PROMPT
                : STRUCTURED_PROMPT;

        const result = await extractionModel.generateContent([
            { inlineData: { data: base64Content, mimeType } },
            { text: prompt },
        ]);

        const raw = result.response.text().replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed.syllabus) || parsed.syllabus.length === 0)
        {
            return { success: false, error: "No syllabus content found in document" };
        }

        const data: ParsedSyllabus = {
            examName: parsed.examName?.trim() ?? null,
            categoryNumber: parsed.categoryNumber?.trim() ?? null,
            description: parsed.description?.trim() ?? null,

            // Coerce to number — Gemini sometimes returns "120" as a string
            duration: parsed.duration != null
                ? Number(String(parsed.duration).replace(/[^\d]/g, "")) || null
                : null,
            totalMarks: parsed.totalMarks != null
                ? Number(String(parsed.totalMarks).replace(/[^\d]/g, "")) || null
                : null,

            tags: Array.isArray(parsed.tags)
                ? parsed.tags.map((t: string) => t?.toLowerCase().trim()).filter(Boolean)
                : [],

            syllabus: parsed.syllabus.map((item: any) => ({
                category: item.category?.trim() ?? "Untitled",
                topics: (item.topics ?? [])
                    .map((t: string) => t?.trim())
                    .filter(Boolean),
            })),
        };

        console.log(`Exam: ${data.examName} | Cat#: ${data.categoryNumber} | Duration: ${data.duration}m | Marks: ${data.totalMarks} | Format: ${format} | Sections: ${data.syllabus.length}`);
        return { success: true, data };

    } catch (error: any)
    {
        console.error("GEMINI_ERROR:", error.status, error.message);
        return { success: false, error: error.message ?? "Failed to parse syllabus" };
    }
}