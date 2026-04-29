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
// import { PrismaClient } from "@prisma/client";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const prisma = new PrismaClient();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const CATEGORY_MAP: Record<string, string> = {
//     "Technical": "6a896918-e681-4f24-977d-5bec8ab04a62",
//     "Administrative": "32bf6c70-833b-4d20-b4c3-4e15226c2390",
//     "Medical": "e686cdc1-3d12-4a40-b533-2d2402f0b051",
//     "Police": "33571f58-d42c-480b-983e-4dae662f30c3",
//     "General": "040b380d-9f0f-4372-9e0d-9a127348adeb",
//     "Education": "32728d29-77c0-4a00-8e80-3f2ddff7f701",
//     "Secretariat": "c5439001-dd92-4ed1-b618-54ef6b4956fc",
//     "Banking": "85cb4de3-7c47-4b11-ab7c-8f4b1c96c64c",
// };

// // ── Audit Log Types ───────────────────────────────────────────────────────────
// interface AuditRecord {
//     examName: string;
//     url: string | null;
//     status: "Success" | "Warning" | "Error" | "Skipped";
//     reasoning: string;
//     hasSyllabus: boolean;
//     syllabusNotes: string;
// }

// // HELPER: Processes an array in chunks
// async function inChunks<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<any>) {
//     const results = [];
//     for (let i = 0; i < items.length; i += chunkSize)
//     {
//         const chunk = items.slice(i, i + chunkSize);
//         results.push(...(await Promise.all(chunk.map(fn))));
//     }
//     return results;
// }

// function makeSlug(name: string, categoryNumber?: string | null): string {
//     const base = name.toLowerCase()
//         .replace(/[;,|]+/g, '-')
//         .replace(/\s+/g, '-')
//         .replace(/[^\w\-]+/g, '')
//         .replace(/-{2,}/g, '-')
//         .replace(/^-|-$/g, '')
//         .trim();
//     return categoryNumber ? `${base}-${categoryNumber.replace(/\//g, '-').toLowerCase()}` : base;
// }

// async function seedExams() {
//     console.log("🚀 Starting Optimized Seeding with Audit Logging...");

//     const filePath = path.join(process.cwd(), "scripts", "kpsc-syllabuses-pdf-parse.json");
//     const examsData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//     //const valid = examsData.filter(i => i.status !== "error" && CATEGORY_MAP[i.examCategory]);

//     //const filePath = path.join(__dirname, "kpsc-syllabuses-pdf-parse.json");
//     const auditPath = path.join(__dirname, "syllabus-seed-audit-report.json");

//     //const examsData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//     const auditLog: AuditRecord[] = [];

//     // Filter and audit skipped items immediately
//     const valid = examsData.filter(item => {
//         if (item.status === "error")
//         {
//             auditLog.push({
//                 examName: item.examName || "Unknown",
//                 url: item.pdfUrl || item.url || null,
//                 status: "Skipped",
//                 reasoning: "Skipped because item status was marked as 'error' in source JSON.",
//                 hasSyllabus: false,
//                 syllabusNotes: "N/A"
//             });
//             return false;
//         }
//         if (!CATEGORY_MAP[item.examCategory])
//         {
//             auditLog.push({
//                 examName: item.examName || "Unknown",
//                 url: item.pdfUrl || item.url || null,
//                 status: "Skipped",
//                 reasoning: `Skipped because category '${item.examCategory}' is not mapped in CATEGORY_MAP.`,
//                 hasSyllabus: false,
//                 syllabusNotes: "N/A"
//             });
//             return false;
//         }
//         return true;
//     });

//     console.log(`Processing ${valid.length} valid exams...\n`);

//     // ── Phase 1 & 2: Pre-collect & Upsert Tags/Categories ─────────────────────
//     const allTagNames = [...new Set(valid.flatMap(i => i.tags ?? []).map((t: string) => t.toLowerCase()))];
//     const allCategoryNames = [...new Set(valid.flatMap(i => (i.syllabus ?? []).map((s: any) => s.category as string)))];

//     await inChunks(allTagNames, 5, (name) =>
//         prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
//     );

//     await inChunks(allCategoryNames, 5, (name) =>
//         prisma.category.upsert({ where: { name }, update: {}, create: { name } })
//     );

//     const [allTags, allCategories] = await Promise.all([
//         prisma.tag.findMany({ select: { id: true, name: true } }),
//         prisma.category.findMany({ select: { id: true, name: true } }),
//     ]);

//     const tagMap = new Map(allTags.map(t => [t.name, t.id]));
//     const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

//     // ── Phase 3: Process Exams & Generate Audit ───────────────────────────────
//     for (let i = 0; i < valid.length; i++)
//     {
//         const item = valid[i];
//         console.log(`[${i + 1}/${valid.length}] ${item.examName}`);

//         let syllabusStatusMsg = "Syllabus processed successfully.";
//         let hasSyllabus = true;

//         // Check for empty/missing syllabus
//         if (!item.syllabus || item.syllabus.length === 0)
//         {
//             hasSyllabus = false;
//             syllabusStatusMsg = "Empty Syllabus: The source JSON contained no syllabus array for this exam.";
//         }

//         try
//         {
//             // Upsert Exam
//             const exam = await prisma.exam.upsert({
//                 where: { name: item.examName },
//                 update: {
//                     slug: makeSlug(item.examName, item.categoryNumber),
//                     categoryNumber: item.categoryNumber,
//                     description: item.description,
//                     duration: item.duration,
//                     totalMarks: item.totalMarks,
//                 },
//                 create: {
//                     name: item.examName,
//                     slug: makeSlug(item.examName, item.categoryNumber),
//                     categoryNumber: item.categoryNumber,
//                     description: item.description,
//                     duration: item.duration ?? 120,
//                     totalMarks: item.totalMarks ?? 100,
//                     examCategoryId: CATEGORY_MAP[item.examCategory],
//                 },
//             });

//             // Upsert Tags
//             if (item.tags?.length > 0)
//             {
//                 await prisma.examsTagsLink.createMany({
//                     data: item.tags.map((t: string) => ({
//                         examId: exam.id,
//                         tagId: tagMap.get(t.toLowerCase())!,
//                     })).filter((r: any) => r.tagId),
//                     skipDuplicates: true,
//                 });
//             }

//             // Upsert Topics & Syllabus Entries
//             if (hasSyllabus)
//             {
//                 const topicUpsertData: { name: string; categoryId: string }[] = [];
//                 for (const section of item.syllabus)
//                 {
//                     const catId = categoryMap.get(section.category);
//                     if (!catId) continue;
//                     for (const topicPath of section.topics)
//                     {
//                         const leafName = topicPath.includes('>') ? topicPath.split('>').pop()!.trim() : topicPath.trim();
//                         topicUpsertData.push({ name: leafName, categoryId: catId });
//                     }
//                 }

//                 await inChunks(topicUpsertData, 5, ({ name, categoryId }) =>
//                     prisma.topic.upsert({
//                         where: { name_categoryId: { name, categoryId } },
//                         update: {},
//                         create: {
//                             name, categoryId, isLeaf: true,
//                             slug: name.toLowerCase().replace(/\s+/g, '-').slice(0, 100)
//                         },
//                     })
//                 );

//                 const currentTopics = await prisma.topic.findMany({
//                     where: { categoryId: { in: Array.from(categoryMap.values()) } },
//                     select: { id: true, name: true, categoryId: true }
//                 });
//                 const topicLookup = new Map(currentTopics.map(t => `${t.categoryId}|${t.name}`).map((key, index) => [key, currentTopics[index].id]));

//                 const syllabusRows = [];
//                 for (const section of item.syllabus)
//                 {
//                     const catId = categoryMap.get(section.category);
//                     if (!catId)
//                     {
//                         syllabusStatusMsg = `Partial Syllabus: Category '${section.category}' was missing from DB mappings.`;
//                         continue;
//                     }
//                     for (const topicPath of section.topics)
//                     {
//                         const leafName = topicPath.includes('>') ? topicPath.split('>').pop()!.trim() : topicPath.trim();
//                         const topicId = topicLookup.get(`${catId}|${leafName}`);
//                         syllabusRows.push({ examId: exam.id, categoryId: catId, topicPath, topicId });
//                     }
//                 }

//                 if (syllabusRows.length > 0)
//                 {
//                     await prisma.examSyllabusEntry.createMany({
//                         data: syllabusRows,
//                         skipDuplicates: true,
//                     });
//                 } else
//                 {
//                     hasSyllabus = false;
//                     syllabusStatusMsg = "Empty Syllabus: Topics existed in JSON but failed to map to DB IDs.";
//                 }
//             }

//             // Log Success or Warning
//             auditLog.push({
//                 examName: item.examName,
//                 url: item.pdfUrl || item.url || null,
//                 status: hasSyllabus ? "Success" : "Warning",
//                 reasoning: `Exam upserted successfully.`,
//                 hasSyllabus: hasSyllabus,
//                 syllabusNotes: syllabusStatusMsg
//             });

//         } catch (err: any)
//         {
//             console.error(`  ✗ Error: ${err.message}`);
//             auditLog.push({
//                 examName: item.examName,
//                 url: item.pdfUrl || item.url || null,
//                 status: "Error",
//                 reasoning: `Database Error: ${err.message}`,
//                 hasSyllabus: false,
//                 syllabusNotes: "Failed before syllabus processing."
//             });
//         }
//     }

//     // ── Phase 4: Save the Audit JSON ──────────────────────────────────────────
//     console.log(`\n💾 Saving Audit Log to ${auditPath}...`);
//     fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2));

//     console.log("Done.");
// }

// seedExams().finally(() => prisma.$disconnect());
///EXAM SEED END////

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

///EXAM SEED 2.0 START////
// import { PrismaClient } from "@prisma/client";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const prisma = new PrismaClient();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const CATEGORY_MAP: Record<string, string> = {
//     "Technical": "6a896918-e681-4f24-977d-5bec8ab04a62",
//     "Administrative": "32bf6c70-833b-4d20-b4c3-4e15226c2390",
//     "Medical": "e686cdc1-3d12-4a40-b533-2d2402f0b051",
//     "Police": "33571f58-d42c-480b-983e-4dae662f30c3",
//     "General": "040b380d-9f0f-4372-9e0d-9a127348adeb",
//     "Education": "32728d29-77c0-4a00-8e80-3f2ddff7f701",
//     "Secretariat": "c5439001-dd92-4ed1-b618-54ef6b4956fc",
//     "Banking": "85cb4de3-7c47-4b11-ab7c-8f4b1c96c64c",
// };

// interface AuditRecord {
//     examName: string;
//     url: string | null;
//     status: "Success" | "Warning" | "Error" | "Skipped";
//     reasoning: string;
//     hasSyllabus: boolean;
//     syllabusNotes: string;
// }

// async function inChunks<T>(items: T[], chunkSize: number, fn: (item: T) => Promise<any>) {
//     const results = [];
//     for (let i = 0; i < items.length; i += chunkSize)
//     {
//         const chunk = items.slice(i, i + chunkSize);
//         results.push(...(await Promise.all(chunk.map(fn))));
//     }
//     return results;
// }

// function makeSlug(name: string, categoryNumber?: string | null): string {
//     const combined = categoryNumber ? `${name} ${categoryNumber}` : name;
//     return combined.toLowerCase()
//         .replace(/[^a-z0-9]+/g, '-')
//         .replace(/^-|-$/g, '')
//         .trim();
// }

// async function seedExams() {
//     console.log("🚀 Starting High-Speed Seeding with Global Extraction...");

//     const filePath = path.join(process.cwd(), "scripts", "kpsc-syllabuses-pdf-parse.json");
//     const auditPath = path.join(__dirname, "syllabus-seed-audit-report.json");

//     const examsData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//     const auditLog: AuditRecord[] = [];

//     const valid = examsData.filter(item => {
//         if (item.status === "error")
//         {
//             auditLog.push({
//                 examName: item.examName || "Unknown", url: item.pdfUrl || item.url || null,
//                 status: "Skipped", reasoning: "Status marked as 'error'.", hasSyllabus: false, syllabusNotes: "N/A"
//             });
//             return false;
//         }
//         if (!CATEGORY_MAP[item.examCategory])
//         {
//             auditLog.push({
//                 examName: item.examName || "Unknown", url: item.pdfUrl || item.url || null,
//                 status: "Skipped", reasoning: `Category '${item.examCategory}' not mapped.`, hasSyllabus: false, syllabusNotes: "N/A"
//             });
//             return false;
//         }
//         return true;
//     });

//     console.log(`Processing ${valid.length} valid exams...\n`);

//     // ── PHASE 1: GLOBAL EXTRACTION & UPSERT ────────────────────────────────────
//     // Instead of doing this per exam, we extract EVERYTHING upfront in memory.

//     // console.log("📦 Extracting global Tags and Categories...");
//     // const allTagNames = [...new Set(valid.flatMap(i => i.tags ?? []).map((t: string) => t.toLowerCase()))];
//     // const allCategoryNames = [...new Set(valid.flatMap(i => (i.syllabus ?? []).map((s: any) => s.category as string)))];

//     // await inChunks(allTagNames, 30, (name) => prisma.tag.upsert({ where: { name }, update: {}, create: { name } }));
//     // await inChunks(allCategoryNames, 30, (name) => prisma.category.upsert({ where: { name }, update: {}, create: { name } }));

//     // const [allTags, allCategories] = await Promise.all([
//     //     prisma.tag.findMany({ select: { id: true, name: true } }),
//     //     prisma.category.findMany({ select: { id: true, name: true } }),
//     // ]);

//     // const tagMap = new Map(allTags.map(t => [t.name, t.id]));
//     // const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

//     // // ⚡ THE SPEED BOOST: Extract ALL Topics globally before the main loop
//     // console.log("📚 Extracting global Topics...");
//     // const globalTopicsMap = new Map<string, { name: string, categoryId: string }>();

//     // for (const item of valid)
//     // {
//     //     if (item.syllabus)
//     //     {
//     //         for (const section of item.syllabus)
//     //         {
//     //             const catId = categoryMap.get(section.category);
//     //             if (!catId) continue;
//     //             for (const topicPath of section.topics)
//     //             {
//     //                 const leafName = topicPath.includes('>') ? topicPath.split('>').pop()!.trim() : topicPath.trim();
//     //                 const uniqueKey = `${catId}|${leafName}`;
//     //                 if (!globalTopicsMap.has(uniqueKey))
//     //                 {
//     //                     globalTopicsMap.set(uniqueKey, { name: leafName, categoryId: catId });
//     //                 }
//     //             }
//     //         }
//     //     }
//     // }

//     // const uniqueTopicsToUpsert = Array.from(globalTopicsMap.values());
//     // console.log(`🚀 Bulk upserting ${uniqueTopicsToUpsert.length} unique topics...`);

//     // // Chunk size increased to 20 for faster topic injection
//     // await inChunks(uniqueTopicsToUpsert, 20, ({ name, categoryId }) =>
//     //     prisma.topic.upsert({
//     //         where: { name_categoryId: { name, categoryId } },
//     //         update: {},
//     //         create: { name, categoryId, isLeaf: true, slug: makeSlug(name) },
//     //     })
//     // );

//     // // Fetch the final Topic dictionary exactly ONCE
//     // console.log("📥 Downloading final Topic ID dictionary into memory...");
//     // const currentTopics = await prisma.topic.findMany({
//     //     where: { categoryId: { in: Array.from(categoryMap.values()) } },
//     //     select: { id: true, name: true, categoryId: true }
//     // });

//     // const topicLookup = new Map(currentTopics.map(t => [`${t.categoryId}|${t.name}`, t.id]));
//     // console.log("✅ Global Setup Complete. Starting high-speed exam injection...\n");

//     // ── PHASE 1: BUILD DICTIONARIES FROM EXISTING DB ───────────────────────────
//     console.log("📦 Downloading existing Tags, Categories, and Topics from DB...");

//     // Fetch everything simultaneously 
//     const [allTags, allCategories, allTopics] = await Promise.all([
//         prisma.tag.findMany({ select: { id: true, name: true } }),
//         prisma.category.findMany({ select: { id: true, name: true } }),
//         prisma.topic.findMany({ select: { id: true, name: true, categoryId: true } })
//     ]);

//     // Build the memory dictionaries
//     const tagMap = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]));
//     const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
//     const topicLookup = new Map(allTopics.map(t => [`${t.categoryId}|${t.name}`, t.id]));

//     console.log(`✅ Loaded ${allTags.length} tags, ${allCategories.length} categories, and ${allTopics.length} topics into memory.`);
//     console.log("🚀 Starting high-speed exam injection...\n");


//     // ── PHASE 2: HIGH-SPEED EXAM LOOP ──────────────────────────────────────────
//     for (let i = 0; i < valid.length; i++)
//     {
//         await sleep(100);
//         const item = valid[i];
//         const currentUrl = item.pdfUrl || item.url || null;
//         console.log(`[${i + 1}/${valid.length}] ${item.examName}`);

//         // PRE-CHECK: DOES EXAM EXIST?
//         const existingExam = await prisma.exam.findUnique({
//             where: { name: item.examName }
//         });

//         if (existingExam)
//         {
//             auditLog.push({
//                 examName: item.examName, url: currentUrl,
//                 status: "Skipped", reasoning: "Exam exact name already exists.", hasSyllabus: false, syllabusNotes: "N/A"
//             });
//             continue;
//         }

//         let syllabusStatusMsg = "Syllabus processed successfully.";
//         let hasSyllabus = true;

//         if (!item.syllabus || item.syllabus.length === 0)
//         {
//             hasSyllabus = false;
//             syllabusStatusMsg = "Empty Syllabus: No syllabus array in source JSON.";
//         }

//         try
//         {
//             // UPSERT EXAM
//             const examSlug = makeSlug(item.examName, item.categoryNumber);
//             const exam = await prisma.exam.upsert({
//                 where: { name: item.examName },
//                 update: {
//                     slug: examSlug, categoryNumber: item.categoryNumber, description: item.description,
//                     duration: item.duration, totalMarks: item.totalMarks, url: currentUrl,
//                 },
//                 create: {
//                     name: item.examName, slug: examSlug, categoryNumber: item.categoryNumber,
//                     description: item.description, duration: item.duration ?? 120, totalMarks: item.totalMarks ?? 100,
//                     url: currentUrl, examCategoryId: CATEGORY_MAP[item.examCategory],
//                 },
//             });

//             // CONNECT TAGS
//             if (item.tags?.length > 0)
//             {
//                 await prisma.examsTagsLink.createMany({
//                     data: item.tags.map((t: string) => ({ examId: exam.id, tagId: tagMap.get(t.toLowerCase())! })).filter((r: any) => r.tagId),
//                     skipDuplicates: true,
//                 });
//             }

//             // ⚡ CONNECT SYLLABUS RAPIDLY (No topic upserts here anymore!)
//             if (hasSyllabus)
//             {
//                 const syllabusRows = [];
//                 for (const section of item.syllabus)
//                 {
//                     const catId = categoryMap.get(section.category);
//                     if (!catId)
//                     {
//                         syllabusStatusMsg = `Partial Syllabus: Category '${section.category}' missing from DB mappings.`;
//                         continue;
//                     }
//                     for (const topicPath of section.topics)
//                     {
//                         const leafName = topicPath.includes('>') ? topicPath.split('>').pop()!.trim() : topicPath.trim();
//                         // Look up the ID from our memory dictionary, zero database calls!
//                         const topicId = topicLookup.get(`${catId}|${leafName}`);
//                         if (topicId)
//                         {
//                             syllabusRows.push({ examId: exam.id, categoryId: catId, topicPath, topicId });
//                         }
//                     }
//                 }

//                 if (syllabusRows.length > 0)
//                 {
//                     await prisma.examSyllabusEntry.createMany({
//                         data: syllabusRows, skipDuplicates: true,
//                     });
//                 } else
//                 {
//                     hasSyllabus = false;
//                     syllabusStatusMsg = "Empty Syllabus: Topics existed in JSON but failed to map to DB IDs.";
//                 }
//             }

//             auditLog.push({
//                 examName: item.examName, url: currentUrl,
//                 status: hasSyllabus ? "Success" : "Warning", reasoning: `Exam upserted successfully.`,
//                 hasSyllabus, syllabusNotes: syllabusStatusMsg
//             });

//         } catch (err: any)
//         {
//             if (err.code === 'P2002')
//             {
//                 const target = err.meta?.target || 'unknown field';
//                 auditLog.push({
//                     examName: item.examName, url: currentUrl,
//                     status: "Skipped", reasoning: `Duplicate conflict on ${target}.`, hasSyllabus: false, syllabusNotes: "N/A"
//                 });
//             } else
//             {
//                 console.error(`  ✗ Error: ${err.message}`);
//                 auditLog.push({
//                     examName: item.examName, url: currentUrl,
//                     status: "Error", reasoning: `Database Error: ${err.message}`, hasSyllabus: false, syllabusNotes: "Failed."
//                 });
//             }
//         }

//         // Progressively save every 50 exams to avoid slowing down the fast loop
//         if (i % 50 === 0)
//         {
//             fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2));
//         }
//     }

//     // Final save
//     fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2));
//     console.log(`\n💾 Seeding complete. Final Audit Log safely saved to ${auditPath}.`);
// }

// seedExams().finally(() => prisma.$disconnect());
///EXAM SEED 2.0 END////



import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditRecord {
    index: number;
    title: string;
    originalTitle: string;
    paperId: string | null;
    status: "SUCCESS" | "SKIPPED_DUPLICATE_URL" | "SKIPPED_NO_QUESTIONS" | "ERROR";
    questionsInserted: number;
    optionsEmbedded: number; // Options stored in JSONB, not separate rows
    pdfUrl: string | null;
    testDate: string | null;
    errorMessage?: string;
    executionTimeMs: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────


function mapQuestionType(raw: string): "MCQ" | "MSQ" | "NUMERICAL" | "SUBJECTIVE" {
    const t = (raw ?? "").toUpperCase().trim();
    if (t === "MSQ") return "MSQ";
    if (t === "NUMERICAL") return "NUMERICAL";
    if (t === "SUBJECTIVE") return "SUBJECTIVE";
    return "MCQ";
}

function mapPaperType(raw: string): "PYQ" | "MOCK" {
    if ((raw ?? "").toLowerCase().includes("mock")) return "MOCK";
    return "PYQ";
}

// Make title unique by appending (2), (3) etc if already exists in set
function makeUniqueTitle(base: string, existingTitles: Set<string>): string {
    const trimmed = base.trim();
    const key = trimmed.toLowerCase();
    if (!existingTitles.has(key)) return trimmed;

    let counter = 2;
    while (existingTitles.has(`${key} (${counter})`))
    {
        counter++;
    }
    return `${trimmed} (${counter})`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function seedQuestionPapers() {
    const startTotal = Date.now();
    const filePath = path.join(process.cwd(), "scripts", "kpsc-papers.json");
    const auditPath = path.join(__dirname, "paper-seed-audit.json");

    if (!fs.existsSync(filePath))
    {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    const papersData: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`\n📂 Loaded ${papersData.length} papers from JSON\n`);

    // ── Phase 1: Load DB state into memory ────────────────────────────────

    console.log("📦 Loading existing DB state (URLs & Titles)...");

    // We only fetch existing titles (for deduplication) and URLs (for skipping)
    const existingPapers = await prisma.questionPaper.findMany({
        select: { id: true, title: true, url: true }
    });

    // Title dedup set — lowercase
    const existingTitles = new Set(existingPapers.map(p => p.title.trim().toLowerCase()));

    // URL check set - filter out any nulls
    const existingUrls = new Set(
        existingPapers
            .map(p => p.url)
            .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    );

    console.log(`  ✓ ${existingTitles.size} existing paper titles loaded`);
    console.log(`  ✓ ${existingUrls.size} existing unique URLs loaded for duplicate checking\n`);

    // ── Phase 2: Process ──────────────────────────────────────────────────

    const auditLog: AuditRecord[] = [];
    let successCount = 0, skipCount = 0, errorCount = 0;

    for (let i = 0; i < papersData.length; i++)
    {
        const paper = papersData[i];
        const startTime = Date.now();
        const originalTitle = (paper.scrapedTitle ?? "Untitled").trim();
        const currentUrl = paper.pdfUrl ?? null;

        console.log(`[${i + 1}/${papersData.length}] ${originalTitle}`);

        // ── Skip: Duplicate URL Check ────────────────────────────────────
        if (currentUrl && existingUrls.has(currentUrl))
        {
            console.log(`  ⏭  SKIPPED — Paper with this URL already exists in DB.`);
            auditLog.push({
                index: i + 1,
                title: originalTitle,
                originalTitle,
                paperId: null,
                status: "SKIPPED_DUPLICATE_URL",
                questionsInserted: 0,
                optionsEmbedded: 0,
                pdfUrl: currentUrl,
                testDate: paper.testDate ?? null,
                executionTimeMs: Date.now() - startTime,
            });
            skipCount++;
            continue;
        }

        // ── Skip: No questions ───────────────────────────────────────────
        const questions: any[] = Array.isArray(paper.questions) ? paper.questions : [];
        if (questions.length === 0)
        {
            console.log(`  ⏭  SKIPPED — no questions extracted`);
            auditLog.push({
                index: i + 1,
                title: originalTitle,
                originalTitle,
                paperId: null,
                status: "SKIPPED_NO_QUESTIONS",
                questionsInserted: 0,
                optionsEmbedded: 0,
                pdfUrl: currentUrl,
                testDate: paper.testDate ?? null,
                executionTimeMs: Date.now() - startTime,
            });
            skipCount++;
            continue;
        }

        // Make unique title — never skip based on title, just suffix
        const title = makeUniqueTitle(originalTitle, existingTitles);
        const isSuffixed = title !== originalTitle;
        if (isSuffixed)
        {
            console.log(`  📝 Renamed to: "${title}" (duplicate title)`);
        }

        // ── Build flat arrays in RAM ─────────────────────────────────────
        const paperId = crypto.randomUUID();
        const questionsToInsert: any[] = [];

        for (const q of questions)
        {
            if (!q.content?.trim()) continue;

            const questionId = crypto.randomUUID();
            const qType = mapQuestionType(q.type);

            // Build JSONB options
            const rawOptions = Array.isArray(q.options) ? q.options : [];
            const optionsJson = rawOptions
                .filter((o: any) => o.text?.trim())
                .map((o: any, idx: number) => ({
                    index: idx,
                    text: o.text.trim(),
                }));

            // Derive correctOptions indices from correctAnswer label ("A", "B", etc.)
            const correctOptions: number[] = [];
            if (q.correctAnswer && (qType === "MCQ" || qType === "MSQ"))
            {
                const labels = q.correctAnswer.toUpperCase().split(",").map((s: string) => s.trim());
                for (const label of labels)
                {
                    const idx = label.charCodeAt(0) - 65; // "A"→0, "B"→1
                    if (idx >= 0 && idx < optionsJson.length) correctOptions.push(idx);
                }
            }

            questionsToInsert.push({
                id: questionId,
                paperId,
                content: q.content.trim(),
                type: qType,
                explanation: q.explanation ?? null,
                options: optionsJson.length > 0 ? optionsJson : undefined,
                correctOptions,
                // NUMERICAL mapping
                exactAnswer: qType === "NUMERICAL" && q.correctAnswer
                    ? parseFloat(q.correctAnswer) || null
                    : null,
            });
        }

        const totalEmbeddedOptions = questionsToInsert.reduce((s, q) => s + (q.options?.length ?? 0), 0);
        console.log(`  ⚙  Prepared: ${questionsToInsert.length} questions, ${totalEmbeddedOptions} options`);

        // ── Insert in transaction ────────────────────────────────────────
        try
        {
            await prisma.$transaction(async (tx) => {
                // 1. Create paper (NO Exam Link)
                await tx.questionPaper.create({
                    data: {
                        id: paperId,
                        title,
                        url: currentUrl,
                        type: mapPaperType(paper.paperType ?? ""),
                        year: paper.extractedYear ?? null,
                    }
                });

                // 2. Bulk insert questions (Options are now inside this!)
                if (questionsToInsert.length > 0)
                {
                    await tx.question.createMany({
                        data: questionsToInsert,
                        skipDuplicates: true,
                    });
                }
            });

            // Update RAM dictionaries so we don't insert duplicates within the same JSON file
            existingTitles.add(title.toLowerCase());
            if (currentUrl) existingUrls.add(currentUrl);

            const ms = Date.now() - startTime;
            successCount++;

            console.log(`  ✅ SUCCESS in ${ms}ms`);
            console.log(`     📄 Title:        ${title}`);
            console.log(`     🌐 PDF URL:      ${currentUrl ?? 'none'}`);
            console.log(`     ❓ Questions:    ${questionsToInsert.length}`);
            console.log(`     🔠 Options:      ${totalEmbeddedOptions}`);

            auditLog.push({
                index: i + 1,
                title,
                originalTitle,
                paperId,
                status: "SUCCESS",
                questionsInserted: questionsToInsert.length,
                optionsEmbedded: totalEmbeddedOptions,
                pdfUrl: currentUrl,
                testDate: paper.testDate ?? null,
                executionTimeMs: ms,
            });

        } catch (err: any)
        {
            const ms = Date.now() - startTime;
            errorCount++;
            console.error(`  ❌ ERROR in ${ms}ms: ${err.message}`);

            auditLog.push({
                index: i + 1,
                title,
                originalTitle,
                paperId,
                status: "ERROR",
                questionsInserted: 0,
                optionsEmbedded: 0,
                pdfUrl: currentUrl,
                testDate: paper.testDate ?? null,
                errorMessage: err.message,
                executionTimeMs: ms,
            });
        }

        // Save audit every 10 papers
        if ((i + 1) % 10 === 0)
        {
            fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2));
        }

        await sleep(150);
    }

    // ── Final summary ──────────────────────────────────────────────────────
    fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2));

    const totalMs = Date.now() - startTotal;
    const successRecords = auditLog.filter(r => r.status === "SUCCESS");
    const totalQ = successRecords.reduce((s, r) => s + r.questionsInserted, 0);
    const totalO = successRecords.reduce((s, r) => s + r.optionsEmbedded, 0);
    const renamed = successRecords.filter(r => r.title !== r.originalTitle).length;

    console.log(`\n${"═".repeat(55)}`);
    console.log(`✅ Inserted:          ${successCount}`);
    console.log(`⏭  Skipped:           ${skipCount} (duplicate URL / no questions)`);
    console.log(`❌ Errors:            ${errorCount}`);
    console.log(`📝 Renamed (dupes):   ${renamed}`);
    console.log(`❓ Total questions:   ${totalQ}`);
    console.log(`🔠 Total options:     ${totalO}`);
    console.log(`⏱  Total time:        ${(totalMs / 1000).toFixed(1)}s`);
    console.log(`💾 Audit log:         ${auditPath}`);
    console.log(`${"═".repeat(55)}\n`);
}

seedQuestionPapers()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());