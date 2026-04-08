import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const INPUT_FILE = path.join(process.cwd(), "scripts", "kpsc-papers.json");
const GEMINI_DELAY_MS = 4000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function backfillExplanationsForPaper(questions: any[]): Promise<Record<number, string>> {
    const needsExplanation = questions.filter(q =>
        q.correctAnswer && !q.explanation && q.content?.trim()
    );

    if (needsExplanation.length === 0) return {};

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `You are an exam explanation writer for Kerala PSC exams.

For each question below, write a brief 1-2 sentence explanation of WHY the given correct answer is correct.
Only explain if you are confident. Return null for pure recall/definition questions where no explanation adds value.

OUTPUT — JSON only:
{ "explanations": { "1": "explanation text", "2": null, "3": "explanation text" } }

QUESTIONS:
${needsExplanation.map(q => `
Q${q.number}: ${q.content}
Options: ${q.options.map((o: any) => `${o.label}) ${o.text}`).join(" | ")}
Correct Answer: ${q.correctAnswer}
`).join("\n---\n")}`;

    try
    {
        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text());
        return parsed.explanations ?? {};
    } catch
    {
        return {};
    }
}

async function main() {
    const papers = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

    const papersNeedingWork = papers.filter((p: any) =>
        p.status === "success" &&
        p.questions?.some((q: any) => q.correctAnswer && !q.explanation)
    );

    console.log(`Papers needing explanation backfill: ${papersNeedingWork.length}`);

    let updatedCount = 0;

    for (let i = 0; i < papers.length; i++)
    {
        const paper = papers[i];

        if (paper.status !== "success" || !paper.questions?.length) continue;

        const needsWork = paper.questions.some((q: any) => q.correctAnswer && !q.explanation);
        if (!needsWork) continue;

        console.log(`[${updatedCount + 1}/${papersNeedingWork.length}] ${paper.scrapedTitle}`);

        const explanations = await backfillExplanationsForPaper(paper.questions);

        // Merge explanations back
        papers[i].questions = paper.questions.map((q: any) => ({
            ...q,
            explanation: q.explanation ?? explanations[q.number] ?? null,
        }));

        updatedCount++;

        // Save after every paper
        fs.writeFileSync(INPUT_FILE, JSON.stringify(papers, null, 2));
        console.log(`  ✓ Added explanations for ${Object.keys(explanations).length} questions`);

        if (i < papers.length - 1) await sleep(GEMINI_DELAY_MS);
    }

    console.log(`\nDone. Updated ${updatedCount} papers.`);
}

main().catch(e => { console.error(e); process.exit(1); });