// import { PrismaClient, QuestionType, Difficulty } from '@prisma/client';
// import * as dotenv from 'dotenv';

// dotenv.config({ path: '.env.local' });

// const prisma = new PrismaClient();

// async function main() {
//     // ==========================================
//     // 1. BASE EXAMS & EXAM CATEGORIES
//     // ==========================================
//     const examCategory = await prisma.examCategory.upsert({
//         where: { slug: 'kerala-psc' },
//         update: {},
//         create: {
//             name: 'Kerala PSC Core',
//             slug: 'kerala-psc',
//             description: 'Main category for state government exams',
//             color: '#EEE20F',
//         },
//     });

//     const examLdc = await prisma.exam.upsert({
//         where: { slug: 'ldc-2026' },
//         update: {},
//         create: {
//             name: 'LDC (Clerk) 2026',
//             slug: 'ldc-2026',
//             description: 'Lower Division Clerk workspace.',
//             duration: 150,
//             totalMarks: 100,
//             examCategoryId: examCategory.id,
//             color: '#0076c5',
//         },
//     });

//     const examHsst = await prisma.exam.upsert({
//         where: { slug: 'hsst-2026' },
//         update: {},
//         create: {
//             name: 'HSST Mathematics 2026',
//             slug: 'hsst-2026',
//             description: 'Higher Secondary School Teacher workspace.',
//             duration: 120,
//             totalMarks: 100,
//             examCategoryId: examCategory.id,
//             color: '#e63946',
//         },
//     });

//     // ==========================================
//     // 2. GLOBAL SUBJECTS (CATEGORIES)
//     // ==========================================
//     const mathsCategory = await prisma.category.create({ data: { name: 'Mathematics' } });
//     const gkCategory = await prisma.category.create({ data: { name: 'General Knowledge' } });
//     const englishCategory = await prisma.category.create({ data: { name: 'General English' } });

//     // ==========================================
//     // 3. GLOBAL TOPICS
//     // ==========================================
//     // Math Topics
//     const percentageTopic = await prisma.topic.create({ data: { name: 'Percentage & Interest', categoryId: mathsCategory.id } });
//     const calculusTopic = await prisma.topic.create({ data: { name: 'Differential Calculus', categoryId: mathsCategory.id } });
//     const numberSeriesTopic = await prisma.topic.create({ data: { name: 'Number Series & Reasoning', categoryId: mathsCategory.id } });

//     // GK Topics
//     const keralaRenaissanceTopic = await prisma.topic.create({ data: { name: 'Kerala Renaissance', categoryId: gkCategory.id } });
//     const indianConstitutionTopic = await prisma.topic.create({ data: { name: 'Indian Constitution', categoryId: gkCategory.id } });
//     const teachingMethodologyTopic = await prisma.topic.create({ data: { name: 'Teaching Methodology', categoryId: gkCategory.id } });

//     // English Topics
//     const basicGrammarTopic = await prisma.topic.create({ data: { name: 'Basic Grammar & Articles', categoryId: englishCategory.id } });
//     const literaryCriticismTopic = await prisma.topic.create({ data: { name: 'Literary Criticism', categoryId: englishCategory.id } });

//     // ==========================================
//     // 4. THE SYLLABUS BRIDGE (MAPPING)
//     // ==========================================
//     // Map LDC Syllabus
//     await prisma.examTopic.createMany({
//         data: [
//             { examId: examLdc.id, topicId: percentageTopic.id },
//             { examId: examLdc.id, topicId: numberSeriesTopic.id },
//             { examId: examLdc.id, topicId: keralaRenaissanceTopic.id }, // Shared Topic
//             { examId: examLdc.id, topicId: indianConstitutionTopic.id },
//             { examId: examLdc.id, topicId: basicGrammarTopic.id },
//         ],
//     });

//     // Map HSST Syllabus
//     await prisma.examTopic.createMany({
//         data: [
//             { examId: examHsst.id, topicId: calculusTopic.id },
//             { examId: examHsst.id, topicId: keralaRenaissanceTopic.id }, // Shared Topic!
//             { examId: examHsst.id, topicId: teachingMethodologyTopic.id },
//             { examId: examHsst.id, topicId: basicGrammarTopic.id },
//             { examId: examHsst.id, topicId: literaryCriticismTopic.id },
//         ],
//     });

//     // ==========================================
//     // 5. QUESTION PAPERS
//     // ==========================================
//     const ldcPaper = await prisma.questionPaper.create({
//         data: { title: 'LDC 2026 Comprehensive Mock 1', year: 2026, examId: examLdc.id },
//     });

//     const hsstPaper = await prisma.questionPaper.create({
//         data: { title: 'HSST 2026 Previous Year Paper', year: 2025, examId: examHsst.id },
//     });

//     // ==========================================
//     // 6. QUESTIONS
//     // ==========================================

//     // --- MATH QUESTIONS ---
//     await prisma.question.create({
//         data: {
//             content: 'Find the next number in the series: 2, 6, 12, 20, ?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.EASY,
//             explanation: 'The differences are 4, 6, 8. The next difference is 10. So 20 + 10 = 30.',
//             topicId: numberSeriesTopic.id,
//             paperId: ldcPaper.id,
//             options: { create: [{ text: '28', isCorrect: false }, { text: '30', isCorrect: true }, { text: '32', isCorrect: false }, { text: '36', isCorrect: false }] },
//         },
//     });

//     // ADDED: Percentage Question for LDC
//     await prisma.question.create({
//         data: {
//             content: 'A sum of money at simple interest amounts to Rs. 815 in 3 years and to Rs. 854 in 4 years. The sum is:',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.MEDIUM,
//             explanation: 'S.I. for 1 year = 854 - 815 = Rs. 39. S.I. for 3 years = 39 * 3 = Rs. 117. Principal = 815 - 117 = Rs. 698.',
//             topicId: percentageTopic.id,
//             paperId: ldcPaper.id,
//             options: { create: [{ text: 'Rs. 650', isCorrect: false }, { text: 'Rs. 690', isCorrect: false }, { text: 'Rs. 698', isCorrect: true }, { text: 'Rs. 700', isCorrect: false }] },
//         },
//     });

//     await prisma.question.create({
//         data: {
//             content: 'Evaluate the integral of cos(x) dx.',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.MEDIUM,
//             explanation: 'The integral of cos(x) is sin(x) + C.',
//             topicId: calculusTopic.id,
//             paperId: hsstPaper.id,
//             options: { create: [{ text: '-sin(x) + C', isCorrect: false }, { text: 'sin(x) + C', isCorrect: true }, { text: '-cos(x) + C', isCorrect: false }, { text: 'tan(x) + C', isCorrect: false }] },
//         },
//     });

//     // --- GK QUESTIONS ---
//     await prisma.question.create({
//         data: {
//             content: 'Who founded the Sivagiri Mutt in 1904?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.MEDIUM,
//             explanation: 'Sree Narayana Guru founded the Sivagiri Mutt to promote his teachings of "One Caste, One Religion, One God for Man".',
//             topicId: keralaRenaissanceTopic.id,
//             paperId: ldcPaper.id, // Assigning to LDC paper for now, but it exists globally in the Renaissance topic
//             options: { create: [{ text: 'Chattampi Swamikal', isCorrect: false }, { text: 'Ayyankali', isCorrect: false }, { text: 'Sree Narayana Guru', isCorrect: true }, { text: 'Mannathu Padmanabhan', isCorrect: false }] },
//         },
//     });

//     await prisma.question.create({
//         data: {
//             content: 'Which article of the Indian Constitution deals with the Right to Constitutional Remedies?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.MEDIUM,
//             explanation: 'Article 32 allows citizens to approach the Supreme Court if fundamental rights are violated.',
//             topicId: indianConstitutionTopic.id,
//             paperId: ldcPaper.id,
//             options: { create: [{ text: 'Article 14', isCorrect: false }, { text: 'Article 21', isCorrect: false }, { text: 'Article 32', isCorrect: true }, { text: 'Article 44', isCorrect: false }] },
//         },
//     });

//     await prisma.question.create({
//         data: {
//             content: 'Which of the following is a student-centric teaching method?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.EASY,
//             explanation: 'Project-based learning centers around the student exploring real-world problems.',
//             topicId: teachingMethodologyTopic.id,
//             paperId: hsstPaper.id,
//             options: { create: [{ text: 'Lecture Method', isCorrect: false }, { text: 'Demonstration Method', isCorrect: false }, { text: 'Project-Based Learning', isCorrect: true }, { text: 'Direct Instruction', isCorrect: false }] },
//         },
//     });

//     // --- ENGLISH QUESTIONS ---
//     await prisma.question.create({
//         data: {
//             content: 'Choose the correct article: She is ___ honest officer.',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.EASY,
//             explanation: '"Honest" begins with a vowel sound (on-est), so we use "an".',
//             topicId: basicGrammarTopic.id,
//             paperId: ldcPaper.id,
//             options: { create: [{ text: 'a', isCorrect: false }, { text: 'an', isCorrect: true }, { text: 'the', isCorrect: false }, { text: 'no article', isCorrect: false }] },
//         },
//     });

//     // ADDED: Literary Criticism Question for HSST
//     await prisma.question.create({
//         data: {
//             content: 'Who coined the term "Objective Correlative"?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.HARD,
//             explanation: 'T.S. Eliot popularized the term in his essay "Hamlet and His Problems" (1919).',
//             topicId: literaryCriticismTopic.id,
//             paperId: hsstPaper.id,
//             options: { create: [{ text: 'Matthew Arnold', isCorrect: false }, { text: 'T.S. Eliot', isCorrect: true }, { text: 'I.A. Richards', isCorrect: false }, { text: 'F.R. Leavis', isCorrect: false }] },
//         },
//     });

//     console.log('Seed completed successfully: Global categories and topics generated with completely mapped questions.');
// }

// main()
//     .catch((e) => {
//         console.error(e);
//         process.exit(1);
//     })
//     .finally(async () => {
//         await prisma.$disconnect();
//     });




///EXAM CATEGOTY SEED START////
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// const categories = [
//     {
//         name: "Technical",
//         description: "Engineering, IT, and specialized technical services exams.",
//         icon: "Cpu",
//         color: "#0F172A", // Slate 900
//     },
//     {
//         name: "Administrative",
//         description: "Civil services, management, and executive level government roles.",
//         icon: "Briefcase",
//         color: "#1E3A8A", // Blue 900
//     },
//     {
//         name: "Medical",
//         description: "Healthcare, Nursing, and Medical Officer entrance exams.",
//         icon: "Stethoscope",
//         color: "#991B1B", // Red 800
//     },
//     {
//         name: "Police",
//         description: "Law enforcement, defense, and security services recruitment.",
//         icon: "ShieldCheck",
//         color: "#064E3B", // Emerald 900
//     },
//     {
//         name: "General",
//         description: "Multi-disciplinary exams and general aptitude assessments.",
//         icon: "Layout",
//         color: "#374151", // Gray 700
//     },
//     {
//         name: "Education",
//         description: "Teaching eligibility, lectureship, and academic research roles.",
//         icon: "GraduationCap",
//         color: "#5B21B6", // Violet 800
//     },
//     {
//         name: "Secretariat",
//         description: "Ministerial, clerical, and administrative support services.",
//         icon: "Building2",
//         color: "#854D0E", // Yellow 800
//     },
//     {
//         name: "Banking",
//         description: "Probationary officers, clerical cadre, and financial services.",
//         icon: "Landmark",
//         color: "#155E75", // Cyan 800
//     },
// ];

// async function main() {
//     console.log("🌱 Starting seeding categories...");

//     for (const cat of categories)
//     {
//         const slug = cat.name
//             .toLowerCase()
//             .replace(/\s+/g, "-")
//             .replace(/[^\w\-]+/g, "");

//         const upsertedCategory = await prisma.examCategory.upsert({
//             where: { name: cat.name },
//             update: {}, // Don't overwrite if exists
//             create: {
//                 name: cat.name,
//                 slug: slug,
//                 description: cat.description,
//                 icon: cat.icon,
//                 color: cat.color,
//             },
//         });
//         console.log(`✅ Upserted category: ${upsertedCategory.name} (${upsertedCategory.id})`);
//     }

//     console.log("🏁 Seeding finished.");
// }

// main()
//     .then(async () => {
//         await prisma.$disconnect();
//     })
//     .catch(async (e) => {
//         console.error(e);
//         await prisma.$disconnect();
//         process.exit(1);
//     });
///EXAM CATEGOTY SEED END////




///EXAM SEED START////
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const CATEGORY_MAP: Record<string, string> = {
    "Technical": "6a896918-e681-4f24-977d-5bec8ab04a62",
    "Administrative": "32bf6c70-833b-4d20-b4c3-4e15226c2390",
    "Medical": "e686cdc1-3d12-4a40-b533-2d2402f0b051",
    "Police": "33571f58-d42c-480b-983e-4dae662f30c3",
    "General": "040b380d-9f0f-4372-9e0d-9a127348adeb",
    "Education": "32728d29-77c0-4a00-8e80-3f2ddff7f701",
    "Secretariat": "c5439001-dd92-4ed1-b618-54ef6b4956fc",
    "Banking": "85cb4de3-7c47-4b11-ab7c-8f4b1c96c64c",
};

// HELPER: Processes an array in chunks to prevent P2024 Pool Timeouts
async function inChunks<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<any>) {
    const results = [];
    for (let i = 0; i < items.length; i += chunkSize)
    {
        const chunk = items.slice(i, i + chunkSize);
        results.push(...(await Promise.all(chunk.map(fn))));
    }
    return results;
}

function makeSlug(name: string, categoryNumber?: string | null): string {
    const base = name.toLowerCase()
        .replace(/[;,|]+/g, '-')     // semicolons/commas → dash
        .replace(/\s+/g, '-')         // spaces → dash
        .replace(/[^\w\-]+/g, '')     // strip everything else
        .replace(/-{2,}/g, '-')       // collapse multiple dashes
        .replace(/^-|-$/g, '')        // trim leading/trailing dashes
        .trim();
    if (categoryNumber)
    {
        return `${base}-${categoryNumber.replace(/\//g, '-').toLowerCase()}`;
    }
    return base;
}

async function seedExams() {
    console.log("🚀 Starting Optimized Seeding...");

    const filePath = path.join(process.cwd(), "scripts", "kpsc-syllabuses-pdf-parse.json");
    const examsData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const valid = examsData.filter(i => i.status !== "error" && CATEGORY_MAP[i.examCategory]);

    console.log(`Processing ${valid.length} exams...\n`);

    // ── Phase 1: Pre-collect unique entities ─────────────────────────────
    const allTagNames = [...new Set(valid.flatMap(i => i.tags ?? []).map((t: string) => t.toLowerCase()))];
    const allCategoryNames = [...new Set(valid.flatMap(i => (i.syllabus ?? []).map((s: any) => s.category as string)))];

    // ── Phase 2: Bulk upsert (Chunked to prevent timeout) ────────────────
    console.log(`Upserting ${allTagNames.length} tags...`);
    await inChunks(allTagNames, 5, (name) =>
        prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
    );

    console.log(`Upserting ${allCategoryNames.length} syllabus categories...`);
    await inChunks(allCategoryNames, 5, (name) =>
        prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    );

    // Fetch into memory
    const [allTags, allCategories] = await Promise.all([
        prisma.tag.findMany({ select: { id: true, name: true } }),
        prisma.category.findMany({ select: { id: true, name: true } }),
    ]);

    const tagMap = new Map(allTags.map(t => [t.name, t.id]));
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

    // ── Phase 3: Process Exams ────────────────────────────────────────────
    for (let i = 0; i < valid.length; i++)
    {
        const item = valid[i];
        console.log(`[${i + 1}/${valid.length}] ${item.examName}`);

        try
        {
            const exam = await prisma.exam.upsert({
                where: { name: item.examName },
                update: {
                    slug: makeSlug(item.examName, item.categoryNumber),
                    categoryNumber: item.categoryNumber,
                    description: item.description,
                    duration: item.duration,
                    totalMarks: item.totalMarks,
                },
                create: {
                    name: item.examName,
                    slug: makeSlug(item.examName, item.categoryNumber),
                    categoryNumber: item.categoryNumber,
                    description: item.description,
                    duration: item.duration ?? 120,
                    totalMarks: item.totalMarks ?? 100,
                    examCategoryId: CATEGORY_MAP[item.examCategory],
                },
            });

            if (item.tags?.length > 0)
            {
                await prisma.examsTagsLink.createMany({
                    data: item.tags.map((t: string) => ({
                        examId: exam.id,
                        tagId: tagMap.get(t.toLowerCase())!,
                    })).filter((r: any) => r.tagId),
                    skipDuplicates: true,
                });
            }

            // Collect all topics for this exam
            const topicUpsertData: { name: string; categoryId: string }[] = [];
            for (const section of (item.syllabus ?? []))
            {
                const catId = categoryMap.get(section.category);
                if (!catId) continue;
                for (const topicPath of section.topics)
                {
                    const leafName = topicPath.includes('>') ? topicPath.split('>').pop()!.trim() : topicPath.trim();
                    topicUpsertData.push({ name: leafName, categoryId: catId });
                }
            }

            // Upsert topics for THIS exam (Chunked)
            await inChunks(topicUpsertData, 5, ({ name, categoryId }) =>
                prisma.topic.upsert({
                    where: { name_categoryId: { name, categoryId } },
                    update: {},
                    create: {
                        name, categoryId, isLeaf: true,
                        slug: name.toLowerCase().replace(/\s+/g, '-').slice(0, 100)
                    },
                })
            );

            // Fetch IDs for links
            const currentTopics = await prisma.topic.findMany({
                where: { categoryId: { in: Array.from(categoryMap.values()) } },
                select: { id: true, name: true, categoryId: true }
            });
            const topicLookup = new Map(currentTopics.map(t => [`${t.categoryId}|${t.name}`, t.id]));

            const syllabusRows = [];
            for (const section of (item.syllabus ?? []))
            {
                const catId = categoryMap.get(section.category);
                if (!catId) continue;
                for (const topicPath of section.topics)
                {
                    const leafName = topicPath.includes('>') ? topicPath.split('>').pop()!.trim() : topicPath.trim();
                    const topicId = topicLookup.get(`${catId}|${leafName}`);
                    syllabusRows.push({ examId: exam.id, categoryId: catId, topicPath, topicId });
                }
            }

            if (syllabusRows.length > 0)
            {
                await prisma.examSyllabusEntry.createMany({
                    data: syllabusRows,
                    skipDuplicates: true,
                });
            }

            console.log(`  ✓ Done`);

        } catch (err: any)
        {
            console.error(`  ✗ Error: ${err.message}`);
        }
    }
    console.log("\nDone.");
}

seedExams().finally(() => prisma.$disconnect());
///EXAM SEED END////