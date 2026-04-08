// scripts/scrape-kpsc-syllabus.ts
// Scrapes keralapsc.gov.in/syllabus1, runs each PDF through Gemini OCR,
// saves results to scripts/kpsc-syllabuses.json for review before DB import.
//
// Run with:
//   npx tsx scripts/scrape-kpsc-syllabus.ts
//
// Requirements:
//   npm install cheerio @google/generative-ai
//   GEMINI_API_KEY in your .env

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = "https://www.keralapsc.gov.in";
const SYLLABUS_PAGE = "https://www.keralapsc.gov.in/syllabus1";
const OUTPUT_FILE = path.join(process.cwd(), "scripts", "kpsc-syllabuses.json");
const SCRAPE_DELAY_MS = 1500;   // between page fetches — be polite
const GEMINI_DELAY_MS = 4000;   // between Gemini calls — stay under rate limit
const MAX_EXAMS = Infinity;     // set to e.g. 5 for a test run

// ── Types ────────────────────────────────────────────────────────────────────

interface ScrapedLink {
    examName: string;
    pdfUrl: string;
}

interface ParsedExam {
    scrapedName: string;
    pdfUrl: string;
    examName: string | null;
    categoryNumber: string | null;
    description: string | null;
    examCategory: string | null;
    duration: number | null;
    totalMarks: number | null;
    tags: string[];
    syllabus: { category: string; topics: string[] }[];
    status: "success" | "failed" | "error";
    error?: string;
    processedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function resolveUrl(href: string): string {
    if (href.startsWith("http")) return href.split("?")[0];
    return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`.split("?")[0];
}

function cleanExamName(raw: string): string {
    return raw
        .replace(/DETAILED SYLLABUS/gi, "")
        .replace(/\s*[-–]\s*cat\s*no[s.]?\s*[\d\/\-]+/gi, "")
        .replace(/\s*\(cat\.?\s*nos?\.?\s*[\d\/;,\s]+\)/gi, "")
        .replace(/\s*[-–]\s*\d{3,4}\/\d{2,4}/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SyllabusBot/1.0)",
                "Accept": "text/html,application/xhtml+xml",
            }
        }, (res) => {
            // Follow redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            {
                fetchHtml(resolveUrl(res.headers.location)).then(resolve).catch(reject);
                return;
            }
            let data = "";
            res.setEncoding("utf8");
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")); });
    });
}

// Add this helper
function stripListPrefix(text: string): string {
    return text
        // Strip roman numeral prefixes: "i.", "ii.", "iii.", "I.", "II.", "iv." etc.
        .replace(/^[ivxlcdmIVXLCDM]+\.\s+/g, "")
        // Strip letter prefixes: "a.", "b.", "A.", "B."
        .replace(/^[a-zA-Z]\.\s+/g, "")
        // Strip number prefixes: "1.", "2.", "12."
        .replace(/^\d+\.\s+/g, "")
        // Strip parenthetical prefixes: "(i)", "(a)", "(1)"
        .replace(/^\([ivxlcdmIVXLCDM\da-zA-Z]+\)\s+/g, "")
        .trim();
}

function fetchBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/pdf,*/*",
                "Referer": "https://www.keralapsc.gov.in/",
            }
        }, (res) => {
            // Follow redirects — including http → https
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            {
                const redirectUrl = res.headers.location.startsWith("http")
                    ? res.headers.location
                    : resolveUrl(res.headers.location);
                console.log(`  Redirecting to: ${redirectUrl}`);
                fetchBuffer(redirectUrl).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200)
            {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }

            const chunks: Buffer[] = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
        });
        req.on("error", reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error("Download timeout")); });
    });
}

// ── Step 1: Scrape the listing page ─────────────────────────────────────────

async function scrapeListingPage(): Promise<ScrapedLink[]> {
    console.log("📄 Fetching KPSC syllabus listing page...");
    const html = await fetchHtml(SYLLABUS_PAGE);
    const $ = cheerio.load(html);
    const links: ScrapedLink[] = [];
    const seenUrls = new Set<string>();

    $(".views-row").each((_, row) => {
        const $row = $(row);

        // Exam name from title field
        const rawTitle = $row.find(".views-field-title .field-content").text().trim();
        const examName = cleanExamName(rawTitle);
        if (!examName) return;

        // Find all PDF links in this row
        const pdfAnchors = $row.find(
            ".views-field-field-file span.file--mime-application-pdf a, " +
            ".views-field-field-file a[href$='.pdf'], " +
            ".views-field-field-file a[type='application/pdf'], " +
            ".field-content ul li a[href$='.pdf'], " +
            ".field-content ul li a[href*='/files/']"
        );

        if (pdfAnchors.length > 0)
        {
            pdfAnchors.each((_, anchor) => {
                const href = $(anchor).attr("href") ?? "";
                if (!href) return;

                const url = resolveUrl(href);
                // Only include actual PDFs
                if (!url.endsWith(".pdf") && !href.includes("application/pdf")) return;
                if (seenUrls.has(url)) return;
                seenUrls.add(url);

                // If link text is a subject name append it (e.g. HSA - ENGLISH, HSA - HINDI)
                const linkText = $(anchor).text().trim();
                const isSubject = linkText &&
                    linkText !== "DETAILED SYLLABUS" &&
                    linkText.toUpperCase() !== examName.toUpperCase();

                links.push({
                    examName: isSubject ? `${examName} - ${linkText}` : examName,
                    pdfUrl: url,
                });
            });
        } else
        {
            // No direct PDF — log so you can investigate manually
            console.log(`  ⚠ No PDF found for: ${examName}`);
        }
    });

    console.log(`  Found ${links.length} PDF links\n`);
    return links;
}

// ── Step 2: Gemini OCR ───────────────────────────────────────────────────────
const GEMINI_API_KEY = "AIzaSyATVkr-7InHdCh3XBQbHbkAuJ8v9kMYS_8"
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

async function detectFormat(base64: string): Promise<"structured" | "tabular" | "prose"> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
        { inlineData: { data: base64, mimeType: "application/pdf" } },
        {
            text: `Classify this syllabus document format. Reply with ONE word only:
- "structured" → numbered sections with bullet/keyword topics
- "tabular"    → marks distribution table first, then prose descriptions  
- "prose"      → flowing paragraphs, no clear bullet structure` }
    ]);
    const fmt = result.response.text().trim().toLowerCase();
    if (fmt.includes("tabular")) return "tabular";
    if (fmt.includes("prose")) return "prose";
    return "structured";
}

const SHARED_IDENTITY = `
EXAM NAME:
- Extract only the clean post/job title. Strip all boilerplate.
- "SYLLABUS FOR THE POST OF RANGE FOREST OFFICER IN KERALA FOREST & WILDLIFE DEPARTMENT" → "Range Forest Officer"
- If multiple posts share this syllabus, separate with " ||| ": "Assistant Engineer Civil ||| Junior Engineer Civil"
- Strip: "SYLLABUS FOR THE POST OF", department names, "KPSC", "Syllabus", "Revised" etc.

CATEGORY NUMBER:
- Look for "Cat. No.", "Cat.Nos.", "Category No.", or codes like "277/2024", "PHY", "CS-01" anywhere.
- If multiple numbers: join with " ; " → "433/2023 ; 434/2023"
- If NOT in document: search Google "[exam name] KPSC category number [year]"
  Use only keralapsc.gov.in or official Kerala PSC notifications.
- Return null if not found after searching.
`;

const SHARED_METADATA = `
━━━ STEP 3: Google Search for metadata ━━━

You MUST call Google Search. Do not skip.

Search "[exam name] Kerala PSC exam details duration marks":
- description: 1-2 sentences — what is this post, who conducts it
- duration: total exam time in MINUTES as a number (e.g. 120, not "2 hours")
- totalMarks: total marks as a number (e.g. 100)
- tags: 3-6 lowercase hyphenated tags e.g. "kerala-psc", "forestry", "degree-level"

EXAM CATEGORY — classify into exactly one:
"Technical" → engineering, forestry, science-based posts
"Banking"   → bank, finance, co-operative sector posts  
"Education" → teacher, lecturer, assistant professor posts
"Medical"   → doctor, nurse, pharmacist, health posts
"Police"    → sub inspector, constable, excise posts
"Administrative" → manager, officer, clerk, typist posts
"Secretariat"    → secretariat assistant, personal assistant posts
"General"   → anything that doesn't fit above

If duration/marks not found: duration = 120, totalMarks = 100
All must be numbers, never strings or null.
`;

const OUTPUT_SHAPE = `
━━━ OUTPUT — JSON only, no markdown ━━━
{
  "examName": "Range Forest Officer",
  "categoryNumber": "277/2024",
  "examCategory": "Technical",
  "description": "Recruitment by Kerala PSC for Range Forest Officer.",
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

const PROMPTS: Record<string, string> = {
    structured: `You are extracting structured data from an exam syllabus document.
You have access to Google Search — use it when information is missing.

━━━ STEP 1: Exam identity ━━━
${SHARED_IDENTITY}

━━━ STEP 2: Syllabus extraction ━━━
- Each numbered section → separate category object.
- Strip number prefix: "1. MECHANICS" → "MECHANICS"
- Use "Parent > Child" for nested topics.
- Preserve exact topic names. Exclude marks, page numbers.
${SHARED_METADATA}
${OUTPUT_SHAPE}`,

    tabular: `You are extracting structured data from an exam syllabus document.
This document has a marks table first, then detailed prose per section.
You have access to Google Search — use it when information is missing.

━━━ STEP 1: Exam identity ━━━
${SHARED_IDENTITY}

━━━ STEP 2: Syllabus extraction ━━━
Use DETAILED CONTENT section, not the marks table.
- Roman numeral sections → categories: "I. GENERAL KNOWLEDGE" → "GENERAL KNOWLEDGE"
- Sub-sections → "Parent > Child": "(i) History" topics → "History > Topic Name"
- Extract individual named topics from prose — do not copy whole sentences.
- Preserve exact names. Exclude marks, page numbers.
${SHARED_METADATA}
${OUTPUT_SHAPE}`,

    prose: `You are extracting structured data from an exam syllabus document.
Topics are described in flowing prose with no clear bullet structure.
You have access to Google Search — use it when information is missing.

━━━ STEP 1: Exam identity ━━━
${SHARED_IDENTITY}

━━━ STEP 2: Syllabus extraction ━━━
- Identify logical subject groupings from the prose.
- Extract individual named concepts as topics.
- Use "Parent > Child" for clearly nested concepts.
- Do not copy entire sentences — extract topic names only.
${SHARED_METADATA}
${OUTPUT_SHAPE}`,
};

async function parseWithGemini(pdfUrl: string) {
    const buffer = await fetchBuffer(pdfUrl);
    console.log(`  PDF size: ${buffer.length} bytes`);

    if (buffer.length < 1000)
    {
        throw new Error(`PDF too small (${buffer.length} bytes)`);
    }

    const header = buffer.slice(0, 5).toString("ascii");
    if (!header.startsWith("%PDF"))
    {
        throw new Error(`Not a valid PDF — header: ${header}`);
    }

    const base64 = buffer.toString("base64");

    // Detect format — if this fails, default to structured
    let format: "structured" | "tabular" | "prose" = "structured";
    try
    {
        format = await detectFormat(base64);
        console.log(`  Format: ${format}`);
    } catch
    {
        console.log(`  Format detection failed, defaulting to structured`);
    }

    const extractionModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} } as any],
    });

    const result = await extractionModel.generateContent([
        { inlineData: { data: base64, mimeType: "application/pdf" } },
        { text: PROMPTS[format] },
    ]);

    const raw = result.response.text().replace(/```json|```/g, "").trim();
    console.log("  Raw response preview:", raw.slice(0, 300));

    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1)
    {
        throw new Error(`No JSON in response: ${raw.slice(0, 200)}`);
    }

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    if (!Array.isArray(parsed.syllabus) || parsed.syllabus.length === 0)
    {
        throw new Error("No syllabus content found");
    }

    return {
        examName: parsed.examName?.trim() ?? null,
        categoryNumber: parsed.categoryNumber?.trim() ?? null,
        examCategory: parsed.examCategory?.trim() ?? "General",
        description: parsed.description?.trim() ?? null,
        duration: parsed.duration != null
            ? Number(String(parsed.duration).replace(/[^\d]/g, "")) || null
            : null,
        totalMarks: parsed.totalMarks != null
            ? Number(String(parsed.totalMarks).replace(/[^\d]/g, "")) || null
            : null,
        tags: Array.isArray(parsed.tags)
            ? parsed.tags.map((t: string) => t?.toLowerCase().trim()).filter(Boolean)
            : [],
        syllabus: parsed.syllabus.map((s: any) => ({
            category: stripListPrefix(s.category?.trim() ?? "Untitled"),
            topics: (s.topics ?? [])
                .map((t: string) => {
                    // Clean each segment of the path separately
                    return t.trim()
                        .split(">")
                        .map((segment: string) => stripListPrefix(segment.trim()))
                        .filter(Boolean)
                        .join(" > ");
                }).filter(Boolean),
        })),
        status: "success" as const,
    };
}

// ── Step 3: Bulk process ─────────────────────────────────────────────────────

async function main() {
    // if (!process.env.GEMINI_API_KEY!)
    // {
    //     console.error("❌ GEMINI_API_KEY not set");
    //     process.exit(1);
    // }

    // Load existing results for resume support
    let results: ParsedExam[] = [];
    if (fs.existsSync(OUTPUT_FILE))
    {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
        console.log(`Resuming — ${results.length} already processed\n`);
    }
    const processedUrls = new Set(results.map(r => r.pdfUrl));

    // Scrape links
    await sleep(SCRAPE_DELAY_MS);
    const links = await scrapeListingPage();
    const toProcess = links
        .filter(l => !processedUrls.has(l.pdfUrl))
        .slice(0, MAX_EXAMS);

    console.log(`Processing ${toProcess.length} new PDFs (${links.length - toProcess.length} already done)\n`);

    for (let i = 0; i < toProcess.length; i++)
    {
        const { examName, pdfUrl } = toProcess[i];
        const label = `[${i + 1}/${toProcess.length}]`;

        console.log(`${label} ${examName}`);
        console.log(`       ${pdfUrl}`);

        try
        {
            await sleep(SCRAPE_DELAY_MS);
            const parsed = await parseWithGemini(pdfUrl);

            results.push({
                scrapedName: examName,
                pdfUrl,
                ...parsed,
                processedAt: new Date().toISOString(),
            });

            console.log(`       ✓ ${parsed.examName} | Cat#: ${parsed.categoryNumber} | ${parsed.syllabus.length} sections | ${parsed.syllabus.flatMap(s => s.topics).length} topics`);
        } catch (err: any)
        {
            console.log(`       ✗ ${err.message}`);
            results.push({
                scrapedName: examName,
                pdfUrl,
                examName: null,
                categoryNumber: null,
                examCategory: null,
                description: null,
                duration: null,
                totalMarks: null,
                tags: [],
                syllabus: [],
                status: "error",
                error: err.message,
                processedAt: new Date().toISOString(),
            });
        }

        // Save after every entry — crash-safe
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        // Rate limit between Gemini calls
        if (i < toProcess.length - 1) await sleep(GEMINI_DELAY_MS);
    }

    // Summary
    const success = results.filter(r => r.status === "success").length;
    const failed = results.filter(r => r.status !== "success").length;
    const totalTopics = results
        .filter(r => r.status === "success")
        .flatMap(r => r.syllabus)
        .flatMap(s => s.topics).length;

    console.log("\n─────────────────────────────────────");
    console.log(`✓ ${success} exams parsed successfully`);
    console.log(`✗ ${failed} failed`);
    console.log(`📚 ${totalTopics} total topics extracted`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
    console.log("\nReview kpsc-syllabuses.json, then run seed-exams-from-results.ts");
}

main().catch(e => { console.error(e); process.exit(1); });