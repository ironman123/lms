"use server";

import { requireAdmin } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ParsedOption {
    label: string;   // "A", "B", "C", "D"
    text: string;
}

export interface ParsedQuestion {
    number: number;
    content: string;
    options: ParsedOption[];
    correctAnswer: string | null;
    explanation: string | null;
    type: "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE";
}

export interface ParsedPaper {
    title: string | null;
    year: number | null;
    totalQuestions: number;
    questions: ParsedQuestion[];
}

async function generateWithRetry(model: any, parts: any[], maxRetries = 3): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            return await model.generateContent(parts);
        } catch (err: any)
        {
            const is429 = err.message?.includes("429");
            if (is429 && attempt < maxRetries - 1)
            {
                const match = err.message.match(/retry in (\d+)/i);
                const wait = (match ? parseInt(match[1]) : 30) + 5;
                console.log(`[OCR] Rate limited — waiting ${wait}s (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, wait * 1000));
            } else
            {
                throw err;
            }
        }
    }
}

export async function parsePaperPDF(
    base64Data: string
): Promise<{ success: true; data: ParsedPaper } | { success: false; error: string }> {
    console.log("[OCR] Verifying admin access...");
    await requireAdmin();

    console.log("[OCR] Starting paper parsing...");

    if (!process.env.GEMINI_API_KEY)
    {
        return { success: false, error: "GEMINI_API_KEY not configured" };
    }

    // Safely split the base64 string
    const parts = base64Data.split(",");
    const base64Content = parts.length === 2 ? parts[1] : parts[0];

    // Extract mimeType or default to application/pdf
    const mimeType = parts.length === 2
        ? parts[0].split(";")[0].split(":")[1]
        : "application/pdf";

    if (!base64Content)
    {
        return { success: false, error: "Invalid base64 data" };
    }

    console.log("[OCR] Sending Paper to Gemini Vision...");

    try
    {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const result = await generateWithRetry(model, [
            {
                inlineData: {
                    data: base64Content,
                    mimeType: mimeType,
                }
            },
            { text: buildExtractionPrompt() }
        ]);

        const raw = result.response.text();
        console.log(`[OCR] Response length: ${raw.length} chars`);
        console.log(`[OCR] RAW RESPONSE:`, raw.slice(0, 2000));
        console.log(`[OCR] Response length: ${raw.length} chars`, raw);

        return parseResponse(raw);
    } catch (err: any)
    {
        console.error(`[OCR] Gemini parse failed: ${err.message}`);
        return { success: false, error: `Gemini parse failed: ${err.message}` };
    }
}

function buildExtractionPrompt(): string {
    return `You are extracting structured data from a Kerala PSC (or similar) exam question paper.

EXTRACTION RULES:
1. Extract the paper title (exam name + paper number if present)
2. Extract the exam year as a 4-digit number
3. Extract EVERY question — do not skip any
4. For each question:
   - number: question number as integer
   - content: full question text exactly as written
   - options: all options with label (A/B/C/D) and text
   - correctAnswer: the correct option label if shown/marked, else null
   - type: "MCQ" (single correct), "MSQ" (multiple correct), "NUMERICAL", or "SUBJECTIVE"
5. If this is an ANSWER KEY only (no question text, just numbers + answers):
   - Set questions to [] and put answers in answerKey object
6. Preserve exact language — do not translate Malayalam or any other language
7. correctAnswer may appear as: bold text, "(A)", "Ans: B", at end of paper, or in a key table
8. For explanation: write 1-2 sentences explaining WHY the correct answer is correct. 
   - Only include if you are confident. Set to null if unsure or if it's a pure recall fact.

OUTPUT — valid JSON only, no markdown fences, no explanation:
{
  "title": "KPSC Assistant Grade II Examination 2023",
  "year": 2023,
  "isAnswerKeyOnly": false,
  "questions": [
    {
      "number": 1,
      "content": "Which of the following is the capital of Kerala?",
      "options": [
        { "label": "A", "text": "Kochi" },
        { "label": "B", "text": "Thiruvananthapuram" },
        { "label": "C", "text": "Kozhikode" },
        { "label": "D", "text": "Thrissur" }
      ],
      "correctAnswer": "B",
      "explanation": "Thiruvananthapuram is the capital and largest city of Kerala, serving as the seat of the state government.",
      "type": "MCQ"
    }
  ],
  "answerKey": {}
}`;
}

function parseResponse(
    raw: string
): { success: true; data: ParsedPaper } | { success: false; error: string } {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1)
    {
        console.error(`[OCR] No JSON found in response: ${raw.slice(0, 200)}`);
        return { success: false, error: `No JSON in response: ${raw.slice(0, 100)}` };
    }

    let parsed: any;
    try
    {
        parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch (err: any)
    {
        console.error(`[OCR] JSON parse error: ${err.message}`);
        return { success: false, error: `Invalid JSON: ${err.message}` };
    }

    // Merge answer key into questions
    const answerKey: Record<string, string> = parsed.answerKey ?? {};
    const rawQuestions = parsed.questions ?? [];

    const questions: ParsedQuestion[] = rawQuestions.map((q: any) => ({
        number: typeof q.number === "number" ? q.number : parseInt(q.number) || 0,
        content: (q.content ?? "").trim(),
        options: (q.options ?? []).map((o: any) => ({
            label: (o.label ?? "").trim().toUpperCase(),
            text: (o.text ?? "").trim(),
        })).filter((o: any) => o.label && o.text),
        correctAnswer: q.correctAnswer ?? answerKey[String(q.number)] ?? null,
        explanation: q.explanation ?? null,
        type: q.type ?? "MCQ",
    })).filter((q: any) => q.content);

    const data: ParsedPaper = {
        title: parsed.title?.trim() ?? null,
        year: parsed.year ? parseInt(String(parsed.year)) : null,
        totalQuestions: questions.length,
        questions,
    };

    console.log(`[OCR] ✓ Parsed: "${data.title}" | Year: ${data.year} | Questions: ${data.totalQuestions}`);

    return { success: true, data };
}