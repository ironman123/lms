// scripts/scrape-kpsc-papers.ts
// Scrapes keralapsc.gov.in/index.php/answerkey_onlineexams
// Extracts questions + answers from each PDF using Gemini
// Saves to scripts/kpsc-papers.json continuously
//
// Run with:
//   npx tsx scripts/scrape-kpsc-papers.ts
//
// Requirements:
//   npm install cheerio @google/generative-ai dotenv
//   GEMINI_API_KEY in your .env

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { createRequire } from "module";

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = "https://www.keralapsc.gov.in";
const PAPERS_PAGE = "https://www.keralapsc.gov.in/index.php/answerkey_onlineexams";
const OUTPUT_FILE = path.join(process.cwd(), "scripts", "kpsc-papers.json");
const SCRAPE_DELAY_MS = 1000;
const BATCH_DELAY_MS = 5000; // Delay between batches to respect rate limits
const CONCURRENCY_LIMIT = 4;  // Process 3 PDFs at once
const MAX_PAGES = 120;
const MAX_PAPERS = Infinity;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedOption {
    label: string;   // "A", "B", "C", "D"
    text: string;
}

interface ExtractedQuestion {
    number: number;
    content: string;
    options: ExtractedOption[];
    correctAnswer: string | null;  // "A", "B", "C", "D" or null if answer key separate
    explanation: string | null;
    type: "MCQ" | "NUMERICAL" | "UNKNOWN";
}

interface ScrapedPaper {
    // From page scraping
    scrapedTitle: string;
    pdfUrl: string;
    questionPaperCode: string | null;   // "53/2026/OL"
    categoryNumber: string | null;       // "272/2025 ; 315/2025" — from page
    searchedCategoryNumber: string | null; // from Google Search fallback
    finalCategoryNumber: string | null;  // best available
    paperType: string | null;            // "Provisional Answer Key" / "Question Paper"
    testDate: string | null;             // "01-04-2026"
    createdDate: string | null;
    extractedYear: number | null;
    extractedExamName: string | null;

    // From PDF parsing
    questions: ExtractedQuestion[];
    totalQuestions: number;
    hasAnswers: boolean;               // did we find correct answers in this PDF?

    // Matching (filled by match-papers-to-exams.ts)
    matchedExamId: string | null;
    matchedExamName: string | null;
    matchStatus: "pending" | "matched" | "ambiguous" | "unmatched";
    matchNote?: string;

    status: "success" | "error" | "no-text";
    error?: string;
    scrapedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function resolveUrl(href: string): string {
    if (href.startsWith("http")) return href.split("?")[0];
    return `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`.split("?")[0];
}

function fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; PaperBot/1.0)",
                "Accept": "text/html,application/xhtml+xml",
            }
        }, (res) => {
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
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            {
                const redirectUrl = res.headers.location.startsWith("http")
                    ? res.headers.location
                    : resolveUrl(res.headers.location);
                console.log(`    ↳ Redirecting to: ${redirectUrl}`);
                fetchBuffer(redirectUrl).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200)
            {
                reject(new Error(`HTTP ${res.statusCode}`));
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

// Extract category number(s) from text — handles multiple formats
function extractCategoryNumbers(text: string): string | null {
    const allFound: string[] = [];

    // "Category Code: 272/2025, 315/2025, 474/2025"
    const catCodeMatch = text.match(/category\s*code[:\s]+([0-9\/,\s;]+)/i);
    if (catCodeMatch)
    {
        const nums = catCodeMatch[1]
            .split(/[,;]/)
            .map(s => s.trim())
            .filter(s => /^\d{1,3}\/\d{4}$/.test(s));
        allFound.push(...nums);
    }

    // Standalone patterns: "277/2024", "Cat.No.385/2024"
    if (allFound.length === 0)
    {
        const patterns = [
            /cat\.?\s*no[s.]?\s*[:\-]?\s*(\d{1,3}\/\d{4})/gi,
            /\b(\d{1,3}\/\d{4})\b/g,
        ];
        for (const pattern of patterns)
        {
            const matches = [...text.matchAll(pattern)];
            for (const m of matches)
            {
                const n = m[1];
                if (!allFound.includes(n)) allFound.push(n);
            }
            if (allFound.length > 0) break;
        }
    }

    return allFound.length > 0 ? allFound.join(" ; ") : null;
}

function extractYear(text: string): number | null {
    const match = text.match(/\b(20[0-2]\d)\b/);
    return match ? parseInt(match[1]) : null;
}

function cleanExamName(raw: string): string {
    return raw
        .replace(/question\s*paper\s*code[:\s]+[^\s,]+/gi, "")
        .replace(/category\s*code[:\s]+[\d\/,\s;]+/gi, "")
        .replace(/date\s*of\s*test[:\s]+[\d\-]+/gi, "")
        .replace(/cat\.?\s*no[s.]?\s*[\d\/\-;,\s]+/gi, "")
        .replace(/\([\d\/\s;,]+\)/g, "")
        .replace(/question\s*paper/gi, "")
        .replace(/answer\s*key/gi, "")
        .replace(/provisional/gi, "")
        .replace(/\b20[0-2]\d\b/g, "")
        .replace(/shift\s*[:\-]?\s*\w+/gi, "")
        .replace(/phase\s*[:\-]?\s*\w+/gi, "")
        .replace(/language[:\s]+[\w\/]+/gi, "")
        .replace(/[-–,]+$/, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ── Gemini setup ──────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateWithRetry(model: any, prompt: string | any[], maxRetries = 3): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++)
    {
        try
        {
            return await model.generateContent(prompt);
        } catch (err: any)
        {
            if (err.message?.includes("429") && attempt < maxRetries - 1)
            {
                const match = err.message.match(/retry in (\d+)/i);
                const wait = match ? parseInt(match[1]) + 5 : 60;
                console.log(`    Rate limited — waiting ${wait}s...`);
                await sleep(wait * 1000);
            } else
            {
                throw err;
            }
        }
    }
}

// ── Google Search fallback for category number ────────────────────────────────

async function searchCategoryNumber(examName: string): Promise<string | null> {
    if (!examName || examName.length < 5) return null;

    try
    {
        const model = genAI.getGenerativeModel({
            model: true ? "gemini-1.5-flash" : "gemini-2.5-flash", // vision only for scanned
            tools: [{ googleSearch: {} } as any],
        });

        const result = await generateWithRetry(model,
            `Search Google for Kerala PSC category number for: "${examName}"

Search: "${examName} Kerala PSC category number site:keralapsc.gov.in"

- Look for numbers in format NNN/YYYY (e.g. 277/2024)
- If multiple found for different years, return ALL: "433/2023 ; 277/2024"
- Only use keralapsc.gov.in or official notifications
- If not found return exactly: null

Reply with ONLY the category number(s) or null.`
        );

        const text = result.response.text().trim();
        if (text.toLowerCase() === "null" || text === "") return null;
        if (/\d{1,3}\/\d{4}/.test(text)) return text;
        return null;

    } catch (err: any)
    {
        console.log(`    Search failed: ${err.message}`);
        return null;
    }
}

// ── PDF Question Extraction ───────────────────────────────────────────────────

const QUESTION_EXTRACTION_PROMPT = `You are extracting questions and answers from a Kerala PSC exam paper.

RULES:
- Extract EVERY question — do not skip any
- For each question extract: number, full question text, all options (A/B/C/D), correct answer if shown
- Correct answer may appear as: bold option, "(A)", "Ans: B", answer key at end, highlighted text
- If this is an ANSWER KEY only PDF (no question text, just numbers and answers), extract as answer-only format
- Preserve exact question text — do not paraphrase or summarize
- Options format: A, B, C, D (normalize whatever format is used)
- If numerical/fill-in-blank (no options), set type to "NUMERICAL"
- If you cannot determine correct answer, set correctAnswer to null
- For explanation: write 1-2 sentences explaining WHY the correct answer is correct. 
  Only include if you are confident. Set to null if unsure or if it's a pure recall fact.

OUTPUT — JSON only, no markdown:
{
  "isAnswerKeyOnly": false,
  "questions": [
    {
      "number": 1,
      "content": "Which of the following is a primary colour?",
      "options": [
        { "label": "A", "text": "Green" },
        { "label": "B", "text": "Red" },
        { "label": "C", "text": "Orange" },
        { "label": "D", "text": "Purple" }
      ],
      "correctAnswer": "B",
      "explanation": "Red is a primary colour in both additive (light) and subtractive (pigment) colour models.",
      "type": "MCQ"
    }
  ],
  "answerKey": {
    "1": "B",
    "2": "A"
  }
}

If isAnswerKeyOnly is true, questions array can be empty and put answers in answerKey.
answerKey maps question number (as string) to correct option label.

PAPER TEXT:
`;

async function extractQuestionsFromPDF(
    rawText: string | null,
    pdfBuffer: Buffer | null
): Promise<{
    questions: ExtractedQuestion[];
    hasAnswers: boolean;
    isAnswerKeyOnly: boolean;
}> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json", // Forces JSON output automatically
        }
    });

    // Start with the base prompt
    const promptParts: any[] = [QUESTION_EXTRACTION_PROMPT];

    // Conditionally attach the text OR the PDF file
    if (rawText)
    {
        // Truncate text to avoid token limits
        promptParts.push(`\n\nPAPER TEXT:\n${rawText.slice(0, 50000)}`);
    } else if (pdfBuffer)
    {
        promptParts.push({
            inlineData: {
                data: pdfBuffer.toString("base64"),
                mimeType: "application/pdf"
            }
        });
    } else
    {
        throw new Error("Must provide either text or a PDF buffer");
    }

    const result = await generateWithRetry(model, promptParts);

    // Because we set responseMimeType to JSON, we don't need regex replacement
    const raw = result.response.text();
    const parsed = JSON.parse(raw);

    // Merge answer key into questions if answer key is separate
    const answerKey: Record<string, string> = parsed.answerKey ?? {};
    const questions: ExtractedQuestion[] = (parsed.questions ?? []).map((q: any) => ({
        number: q.number,
        content: q.content?.trim() ?? "",
        options: (q.options ?? []).map((o: any) => ({
            label: o.label?.trim().toUpperCase(),
            text: o.text?.trim(),
        })),
        correctAnswer: q.correctAnswer ?? answerKey[String(q.number)] ?? null,
        explanation: q.explanation ?? null,
        type: q.type ?? "MCQ",
    }));

    const hasAnswers = questions.some(q => q.correctAnswer !== null) ||
        Object.keys(answerKey).length > 0;

    return {
        questions,
        hasAnswers,
        isAnswerKeyOnly: parsed.isAnswerKeyOnly ?? false,
    };
}

// ── Step 1: Scrape listing pages ──────────────────────────────────────────────

interface PageRow {
    scrapedTitle: string;
    pdfUrl: string;
    questionPaperCode: string | null;
    categoryNumber: string | null;
    paperType: string | null;
    testDate: string | null;
    createdDate: string | null;
    extractedYear: number | null;
    extractedExamName: string | null;
}

async function scrapeAllPages(): Promise<PageRow[]> {
    console.log("📄 Fetching KPSC question papers listing...");

    const rows: PageRow[] = [];
    const seenUrls = new Set<string>();
    let page = 0;

    while (page < MAX_PAGES)
    {
        const pageUrl = `${PAPERS_PAGE}?tid=All&page=${page}`;
        console.log(`  Page ${page}: ${pageUrl}`);

        try
        {
            const html = await fetchHtml(pageUrl);
            const $ = cheerio.load(html);

            // Use 2nd tbody if multiple exist (first is often the header)
            const tbodies = $("table tbody");
            const tbody = tbodies.length >= 2 ? tbodies.eq(1) : tbodies.first();
            const tableRows = tbody.find("tr");

            if (tableRows.length === 0)
            {
                console.log(`  No rows on page ${page} — done.`);
                break;
            }

            let newOnPage = 0;

            tableRows.each((_, row) => {
                const $row = $(row);

                // Title column
                const rawTitle = $row
                    .find("td[headers='view-title-table-column'], td.views-field-title")
                    .first().text().trim();

                // Details/body column — has category code, date of test, question paper code
                const detailsText = $row
                    .find("td[headers='view-body-table-column'], td.views-field-body")
                    .first().text().trim();

                // Type column — "Provisional Answer Key" / "Question Paper"
                const paperType = $row
                    .find("td[headers='view-term-node-tid-table-column'], td.views-field-term-node-tid")
                    .first().text().trim() || null;

                // Created date column
                const createdDate = $row
                    .find("td[headers='view-created-table-column'], td.views-field-created")
                    .first().text().trim() || null;

                // ── Extract from details text ─────────────────────────────
                // "Question Paper Code: 53/2026/OL, Category Code: 239/2025, 240/2025, ..."
                const qpCodeMatch = detailsText.match(/question\s*paper\s*code[:\s]+([^\s,]+)/i);
                const questionPaperCode = qpCodeMatch ? qpCodeMatch[1].trim() : null;

                const catFromDetails = extractCategoryNumbers(detailsText);

                // "Date of Test 01-04-2026"
                const testDateMatch = detailsText.match(/date\s*of\s*test[:\s]*(\d{2}-\d{2}-\d{4})/i);
                const testDate = testDateMatch ? testDateMatch[1] : null;

                // PDF links
                const pdfAnchors = $row.find(
                    "td[headers='view-field-file-table-column'] a, " +
                    "td.views-field-field-file a, " +
                    "a[href$='.pdf']"
                );

                if (pdfAnchors.length === 0) return;

                pdfAnchors.each((_, anchor) => {
                    const href = $(anchor).attr("href") ?? "";
                    if (!href) return;

                    const url = resolveUrl(href);
                    if (!url.endsWith(".pdf") && !href.includes("/files/")) return;
                    if (seenUrls.has(url)) return;
                    seenUrls.add(url);

                    const linkText = $(anchor).text().trim();
                    const filename = decodeURIComponent(url.split("/").pop() ?? "");
                    const title = rawTitle || linkText || filename;
                    const searchText = `${title} ${detailsText} ${filename}`;

                    rows.push({
                        scrapedTitle: title,
                        pdfUrl: url,
                        questionPaperCode,
                        categoryNumber: catFromDetails ?? extractCategoryNumbers(searchText),
                        paperType,
                        testDate,
                        createdDate,
                        extractedYear: testDate
                            ? parseInt(testDate.split("-")[2])
                            : extractYear(searchText),
                        extractedExamName: cleanExamName(rawTitle || linkText),
                    });
                    newOnPage++;
                });
            });

            if (newOnPage === 0)
            {
                console.log(`  No new links on page ${page} — stopping.`);
                break;
            }

            console.log(`  +${newOnPage} papers (total: ${rows.length})`);
            page++;
            await sleep(SCRAPE_DELAY_MS);

        } catch (err: any)
        {
            console.error(`  ❌ Page ${page}: ${err.message}`);
            break;
        }
    }

    console.log(`\nTotal scraped: ${rows.length} papers\n`);
    return rows;
}

// ── Step 2: Process each PDF ──────────────────────────────────────────────────

async function processPaper(row: PageRow): Promise<ScrapedPaper> {
    // Note: I removed the Google Search fallback here as discussed previously
    const finalCategoryNumber = row.categoryNumber;

    console.log(`  Downloading PDF...`);
    const buffer = await fetchBuffer(row.pdfUrl);
    console.log(`  PDF size: ${buffer.length} bytes`);

    if (buffer.length < 500)
    {
        throw new Error(`PDF too small (${buffer.length} bytes)`);
    }

    const header = buffer.slice(0, 5).toString("ascii");
    if (!header.startsWith("%PDF"))
    {
        throw new Error(`Not a valid PDF — header: ${header}`);
    }

    // ── THE HYBRID LOGIC ──
    console.log(`  Attempting local text extraction...`);
    let rawText = "";
    try
    {
        const parsed = await pdfParse(buffer);
        rawText = parsed.text ?? "";
    } catch (err: any)
    {
        console.log(`  Local parsing failed: ${err.message}`);
    }

    let extractionData;

    // Check if we got meaningful text out of pdf-parse
    if (rawText.trim().length > 150)
    {
        console.log(`  ✓ Digital PDF detected (${rawText.length} chars). Using fast text-extraction...`);
        // Pass the text, leave buffer null
        extractionData = await extractQuestionsFromPDF(rawText, null);
    } else
    {
        console.log(`  ⚠ Scanned PDF detected. Falling back to Gemini Vision OCR...`);
        // Pass the buffer, leave text null
        extractionData = await extractQuestionsFromPDF(null, buffer);
    }

    const { questions, hasAnswers, isAnswerKeyOnly } = extractionData;

    console.log(`  ✓ ${questions.length} questions | answers: ${hasAnswers} | answer-key-only: ${isAnswerKeyOnly}`);

    return {
        ...row,
        searchedCategoryNumber: null,
        finalCategoryNumber,
        questions,
        totalQuestions: questions.length,
        hasAnswers,
        matchedExamId: null,
        matchedExamName: null,
        matchStatus: "pending",
        status: "success",
        scrapedAt: new Date().toISOString(),
    };
}
// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.GEMINI_API_KEY)
    {
        console.error("❌ GEMINI_API_KEY not set in .env");
        process.exit(1);
    }

    // 1. Resume support
    let results: ScrapedPaper[] = [];
    if (fs.existsSync(OUTPUT_FILE))
    {
        results = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
        console.log(`Resuming — ${results.length} already processed\n`);
    }
    const processedUrls = new Set(results.map(r => r.pdfUrl));

    // 2. Step 1 — Scrape all listing pages
    await sleep(SCRAPE_DELAY_MS);
    const allRows = await scrapeAllPages();

    const toProcess = allRows
        .filter(r => !processedUrls.has(r.pdfUrl))
        .slice(0, MAX_PAPERS);

    console.log(`Processing ${toProcess.length} new PDFs (${processedUrls.size} already done)\n`);

    // 3. Step 2 — Process in Batches
    for (let i = 0; i < toProcess.length; i += CONCURRENCY_LIMIT)
    {
        const batch = toProcess.slice(i, i + CONCURRENCY_LIMIT);
        const batchLabel = `Batch [${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(toProcess.length / CONCURRENCY_LIMIT)}]`;

        console.log(`🚀 ${batchLabel} starting...`);

        // Map each row in the batch to a processing promise
        const batchPromises = batch.map(async (row, index) => {
            const globalIndex = i + index + 1;
            const label = `[${globalIndex}/${toProcess.length}]`;

            try
            {
                // Add a slight "jitter" so they don't all hit the network at the exact same ms
                await sleep(index * 500);

                const paper = await processPaper(row);

                if (paper.status === "success")
                {
                    console.log(`${label} ✓ ${paper.scrapedTitle} (${paper.totalQuestions}q)`);
                }
                return paper;

            } catch (err: any)
            {
                console.log(`${label} ✗ ${row.scrapedTitle}: ${err.message}`);
                // Maintain the exact error structure from your original script
                return {
                    ...row,
                    searchedCategoryNumber: null,
                    finalCategoryNumber: row.categoryNumber,
                    questions: [],
                    totalQuestions: 0,
                    hasAnswers: false,
                    matchedExamId: null,
                    matchedExamName: null,
                    matchStatus: "pending",
                    status: "error",
                    error: err.message,
                    scrapedAt: new Date().toISOString(),
                } as ScrapedPaper;
            }
        });

        // Wait for the entire batch to finish
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // 4. Save after every batch — crash safe (Exact same logic as your original)
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

        // Wait between batches to avoid rate limits
        if (i + CONCURRENCY_LIMIT < toProcess.length)
        {
            console.log(`⏳ Cooling down for ${BATCH_DELAY_MS / 1000}s...`);
            await sleep(BATCH_DELAY_MS);
        }
    }

    // 5. ── Summary (Exact same logic as your original) ────────────────────────
    const success = results.filter(r => r.status === "success");
    const noText = results.filter(r => r.status === "no-text");
    const errors = results.filter(r => r.status === "error");
    const withCatNum = results.filter(r => r.finalCategoryNumber);
    const withAnswers = success.filter(r => r.hasAnswers);
    const totalQuestions = success.reduce((sum, r) => sum + r.totalQuestions, 0);

    console.log("\n─────────────────────────────────────────────");
    console.log(`✓ Success:           ${success.length}`);
    console.log(`⚠ No text (scanned): ${noText.length}`);
    console.log(`✗ Errors:            ${errors.length}`);
    console.log(`📋 Total questions:  ${totalQuestions}`);
    console.log(`🔑 With answers:     ${withAnswers.length}/${success.length}`);
    console.log(`🔢 With cat#:        ${withCatNum.length}/${results.length}`);
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
    console.log("\nNext: seed exams → run match-papers-to-exams.ts → seed-papers.ts");
}

main().catch(e => { console.error(e); process.exit(1); });