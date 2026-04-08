// scripts/deduplicate-syllabuses.ts
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

const INPUT = path.join(process.cwd(), "scripts", "kpsc-syllabuses-pdf-parse.json");
const OUTPUT = path.join(process.cwd(), "scripts", "kpsc-syllabuses-deduped.json");
const REPORT = path.join(process.cwd(), "scripts", "dedup-report.json");

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

// Jaccard similarity on word sets
function nameSimilarity(a: string, b: string): number {
    const wa = new Set(normalize(a).split(" ").filter(Boolean));
    const wb = new Set(normalize(b).split(" ").filter(Boolean));
    if (wa.size === 0 || wb.size === 0) return 0;
    const intersection = [...wa].filter(w => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return intersection / union;
}

// Deep equality check for syllabuses
function syllabusEqual(a: any[], b: any[]): boolean {
    if (!a || !b) return false;
    return JSON.stringify(
        a.map(s => ({ category: normalize(s.category ?? ""), topics: (s.topics ?? []).map(normalize).sort() }))
            .sort((x, y) => x.category.localeCompare(y.category))
    ) === JSON.stringify(
        b.map(s => ({ category: normalize(s.category ?? ""), topics: (s.topics ?? []).map(normalize).sort() }))
            .sort((x, y) => x.category.localeCompare(y.category))
    );
}

// Extract individual exam names from ||| separated string
function splitNames(examName: string): string[] {
    return (examName ?? "").split("|||").map(n => n.trim()).filter(Boolean);
}

// Check if all names in 'a' exist inside 'b's name list
function isSubsetOf(a: string, b: string): boolean {
    const namesA = splitNames(a).map(normalize);
    const namesB = splitNames(b).map(normalize);
    return namesA.length < namesB.length && namesA.every(n => namesB.includes(n));
}

function mergeCategoryNumbers(a: string | null, b: string | null): string | null {
    const parts = new Set<string>();
    for (const s of [a, b])
    {
        if (!s) continue;
        s.split(";").map(p => p.trim()).filter(Boolean).forEach(p => parts.add(p));
    }
    return parts.size > 0 ? [...parts].join(" ; ") : null;
}

function mergeTags(a: string[], b: string[]): string[] {
    return [...new Set([...(a ?? []), ...(b ?? [])])];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const raw: any[] = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
    const successful = raw.filter(r => r.status === "success");
    const failed = raw.filter(r => r.status !== "success");

    console.log(`Total: ${raw.length} | Success: ${successful.length} | Failed: ${failed.length}\n`);

    const report: any = {
        exactUrlDuplicates: [],
        exactSyllabusDuplicates: [],
        subsetNamesDropped: [],
        finalCount: 0,
    };

    // ── Step 1: Remove exact URL duplicates ───────────────────────────────────
    const seenUrls = new Map<string, any>();
    for (const item of successful)
    {
        const url = item.pdfUrl?.trim();
        if (!url) continue;
        if (seenUrls.has(url))
        {
            report.exactUrlDuplicates.push({ kept: seenUrls.get(url).examName, dropped: item.examName, url });
            console.log(`🔁 URL dup — keeping "${seenUrls.get(url).examName}", dropping "${item.examName}"`);
        } else
        {
            seenUrls.set(url, item);
        }
    }
    let entries = [...seenUrls.values()];
    console.log(`After URL dedup: ${entries.length} (removed ${successful.length - entries.length})\n`);

    // ── Step 2: Remove exact syllabus duplicates ──────────────────────────────
    // Conditions: same category + cat# overlap + 75%+ name similarity + identical syllabus
    const toRemove = new Set<number>();

    for (let i = 0; i < entries.length; i++)
    {
        if (toRemove.has(i)) continue;
        for (let j = i + 1; j < entries.length; j++)
        {
            if (toRemove.has(j)) continue;

            const a = entries[i];
            const b = entries[j];

            // Must be same category
            if (a.examCategory !== b.examCategory) continue;

            // Name similarity must be >= 0.75
            const nameSim = nameSimilarity(a.scrapedName, b.scrapedName);
            if (nameSim < 0.75) continue;

            // Category numbers must overlap (if both have one)
            if (a.categoryNumber && b.categoryNumber)
            {
                const catsA = new Set(a.categoryNumber.split(";").map((s: string) => s.trim()));
                const catsB = b.categoryNumber.split(";").map((s: string) => s.trim());
                const overlap = catsB.some((c: string) => catsA.has(c));
                if (!overlap) continue;
            }

            // Syllabus must be exactly the same
            if (!syllabusEqual(a.syllabus ?? [], b.syllabus ?? [])) continue;

            // Keep the one with more category numbers, merge tags
            const keepA = (a.categoryNumber ?? "").split(";").length >= (b.categoryNumber ?? "").split(";").length;
            const [keep, drop] = keepA ? [i, j] : [j, i];

            entries[keep].categoryNumber = mergeCategoryNumbers(a.categoryNumber, b.categoryNumber);
            entries[keep].tags = mergeTags(a.tags, b.tags);

            toRemove.add(drop);
            report.exactSyllabusDuplicates.push({
                kept: entries[keep].examName,
                dropped: entries[drop].examName,
                nameSimilarity: nameSim.toFixed(2),
                categoryNumber: entries[keep].categoryNumber,
            });
            console.log(`📋 Syllabus dup (${(nameSim * 100).toFixed(0)}% name sim) — keeping "${entries[keep].examName}", dropping "${entries[drop].examName}"`);
        }
    }

    entries = entries.filter((_, i) => !toRemove.has(i));
    console.log(`\nAfter syllabus dedup: ${entries.length} (removed ${toRemove.size})\n`);

    // ── Step 3: Drop subset examNames ─────────────────────────────────────────
    // If examName of A is fully contained in examName of B (via |||), drop A
    const subsetRemove = new Set<number>();

    for (let i = 0; i < entries.length; i++)
    {
        if (subsetRemove.has(i)) continue;
        for (let j = 0; j < entries.length; j++)
        {
            if (i === j || subsetRemove.has(j)) continue;

            const a = entries[i];
            const b = entries[j];

            if (a.examCategory !== b.examCategory) continue;

            // A's names are a strict subset of B's names
            if (isSubsetOf(a.examName, b.examName))
            {
                // Extra check: syllabuses should be similar
                const sim = nameSimilarity(a.scrapedName, b.scrapedName);
                if (sim < 0.3) continue; // too different, probably different exams

                subsetRemove.add(i);
                report.subsetNamesDropped.push({
                    dropped: a.examName,
                    keptInstead: b.examName,
                    reason: `"${a.examName}" is a subset of "${b.examName}"`,
                });
                console.log(`⊂  Subset drop — "${a.examName}" contained in "${b.examName}"`);
                break;
            }
        }
    }

    entries = entries.filter((_, i) => !subsetRemove.has(i));
    console.log(`\nAfter subset drop: ${entries.length} (removed ${subsetRemove.size})\n`);

    // ── Step 4: Write output ──────────────────────────────────────────────────
    report.finalCount = entries.length;

    console.log("── Summary ──");
    console.log(`Input:                  ${raw.length}`);
    console.log(`Failed (skipped):       ${failed.length}`);
    console.log(`URL duplicates removed: ${report.exactUrlDuplicates.length}`);
    console.log(`Syllabus dups removed:  ${report.exactSyllabusDuplicates.length}`);
    console.log(`Subset names dropped:   ${report.subsetNamesDropped.length}`);
    console.log(`Final unique exams:     ${entries.length}`);

    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2));
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

    // Write failed separately for retry
    fs.writeFileSync(
        path.join(process.cwd(), "scripts", "kpsc-syllabuses-failed.json"),
        JSON.stringify(failed, null, 2)
    );

    console.log(`\n💾 ${OUTPUT}`);
    console.log(`📋 ${REPORT}`);
}

main().catch(e => { console.error(e); process.exit(1); });