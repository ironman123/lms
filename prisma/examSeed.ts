// import { PrismaClient, QuestionType, Difficulty } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//     // 1. Create the Parent Category
//     const category = await prisma.examCategory.upsert({
//         where: { slug: 'temp' },
//         update: {},
//         create: {
//             name: 'TEMP',
//             slug: 'temp',
//             description: 'This is temprory Category',
//             color: '#EEE20F',
//         },
//     });

//     // 2. Create the Specific Exam
//     const exam = await prisma.exam.upsert({
//         where: { slug: 'ldc-2026' },
//         update: {},
//         create: {
//             name: 'LDC (Clerk) 2026',
//             slug: 'ldc-2026',
//             description: 'Lower Division Clerk workspace for 2026 recruitment cycle.',
//             duration: 150,
//             totalMarks: 200,
//             examCategoryId: category.id,
//             color: '#0076c5',
//         },
//     });

//     // 3. Create Syllabus Categories
//     const gkCategory = await prisma.category.create({
//         data: {
//             name: 'Temp General Knowledge',
//             examId: exam.id,
//         },
//     });

//     const mathsCategory = await prisma.category.create({
//         data: {
//             name: 'Temp Simple Arithmetic',
//             examId: exam.id,
//         },
//     });

//     // 4. Create Topics
//     const keralaHistory = await prisma.topic.create({
//         data: {
//             name: 'Temp Kerala History',
//             categoryId: gkCategory.id,
//         },
//     });

//     const percentageTopic = await prisma.topic.create({
//         data: {
//             name: 'Temp Percentage & Interest',
//             categoryId: mathsCategory.id,
//         },
//     });

//     // 5. Create the Question Paper
//     const questionPaper = await prisma.questionPaper.create({
//         data: {
//             title: 'LDC 2026 Official Mock - 01',
//             year: 2025,
//             examId: exam.id,
//         },
//     });

//     // 6. Seed Questions
//     await prisma.question.create({
//         data: {
//             content: 'Who was the leader of the Ezhava Memorial submitted in 1896?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.MEDIUM,
//             marks: 1.0,
//             negativeMarks: 0.33,
//             explanation: 'G.P. Pillai was the leader of the Ezhava Memorial.',
//             topicId: keralaHistory.id,
//             paperId: questionPaper.id,
//             correctAnswer: 'G.P. Pillai',
//             options: {
//                 create: [
//                     { text: 'Dr. Palpu', isCorrect: false },
//                     { text: 'G.P. Pillai', isCorrect: true },
//                     { text: 'Kumaranasan', isCorrect: false },
//                     { text: 'T.K. Madhavan', isCorrect: false },
//                 ],
//             },
//         },
//     });

//     await prisma.question.create({
//         data: {
//             content: 'If the price of a commodity increases by 25%, by what percentage should a consumer reduce consumption so as not to increase expenditure?',
//             type: QuestionType.MCQ,
//             difficulty: Difficulty.HARD,
//             marks: 1.0,
//             negativeMarks: 0.33,
//             explanation: 'Formula: [r / (100 + r)] * 100 => [25/125] * 100 = 20%.',
//             topicId: percentageTopic.id,
//             paperId: questionPaper.id,
//             correctAnswer: '20%',
//             options: {
//                 create: [
//                     { text: '25%', isCorrect: false },
//                     { text: '20%', isCorrect: true },
//                     { text: '15%', isCorrect: false },
//                     { text: '10%', isCorrect: false },
//                 ],
//             },
//         },
//     });

//     console.log('Seed completed successfully: LDC 2025 Paper Created.');
// }

// main()
//     .catch((e) => {
//         console.error(e);
//         process.exit(1);
//     })
//     .finally(async () => {
//         await prisma.$disconnect();
//     });