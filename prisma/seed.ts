import { PrismaClient, QuestionType, Difficulty } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
    // ==========================================
    // 1. BASE EXAMS & EXAM CATEGORIES
    // ==========================================
    const examCategory = await prisma.examCategory.upsert({
        where: { slug: 'kerala-psc' },
        update: {},
        create: {
            name: 'Kerala PSC Core',
            slug: 'kerala-psc',
            description: 'Main category for state government exams',
            color: '#EEE20F',
        },
    });

    const examLdc = await prisma.exam.upsert({
        where: { slug: 'ldc-2026' },
        update: {},
        create: {
            name: 'LDC (Clerk) 2026',
            slug: 'ldc-2026',
            description: 'Lower Division Clerk workspace.',
            duration: 150,
            totalMarks: 100,
            examCategoryId: examCategory.id,
            color: '#0076c5',
        },
    });

    const examHsst = await prisma.exam.upsert({
        where: { slug: 'hsst-2026' },
        update: {},
        create: {
            name: 'HSST Mathematics 2026',
            slug: 'hsst-2026',
            description: 'Higher Secondary School Teacher workspace.',
            duration: 120,
            totalMarks: 100,
            examCategoryId: examCategory.id,
            color: '#e63946',
        },
    });

    // ==========================================
    // 2. GLOBAL SUBJECTS (CATEGORIES)
    // ==========================================
    const mathsCategory = await prisma.category.create({ data: { name: 'Mathematics' } });
    const gkCategory = await prisma.category.create({ data: { name: 'General Knowledge' } });
    const englishCategory = await prisma.category.create({ data: { name: 'General English' } });

    // ==========================================
    // 3. GLOBAL TOPICS
    // ==========================================
    // Math Topics
    const percentageTopic = await prisma.topic.create({ data: { name: 'Percentage & Interest', categoryId: mathsCategory.id } });
    const calculusTopic = await prisma.topic.create({ data: { name: 'Differential Calculus', categoryId: mathsCategory.id } });
    const numberSeriesTopic = await prisma.topic.create({ data: { name: 'Number Series & Reasoning', categoryId: mathsCategory.id } });

    // GK Topics
    const keralaRenaissanceTopic = await prisma.topic.create({ data: { name: 'Kerala Renaissance', categoryId: gkCategory.id } });
    const indianConstitutionTopic = await prisma.topic.create({ data: { name: 'Indian Constitution', categoryId: gkCategory.id } });
    const teachingMethodologyTopic = await prisma.topic.create({ data: { name: 'Teaching Methodology', categoryId: gkCategory.id } });

    // English Topics
    const basicGrammarTopic = await prisma.topic.create({ data: { name: 'Basic Grammar & Articles', categoryId: englishCategory.id } });
    const literaryCriticismTopic = await prisma.topic.create({ data: { name: 'Literary Criticism', categoryId: englishCategory.id } });

    // ==========================================
    // 4. THE SYLLABUS BRIDGE (MAPPING)
    // ==========================================
    // Map LDC Syllabus
    await prisma.examTopic.createMany({
        data: [
            { examId: examLdc.id, topicId: percentageTopic.id },
            { examId: examLdc.id, topicId: numberSeriesTopic.id },
            { examId: examLdc.id, topicId: keralaRenaissanceTopic.id }, // Shared Topic
            { examId: examLdc.id, topicId: indianConstitutionTopic.id },
            { examId: examLdc.id, topicId: basicGrammarTopic.id },
        ],
    });

    // Map HSST Syllabus
    await prisma.examTopic.createMany({
        data: [
            { examId: examHsst.id, topicId: calculusTopic.id },
            { examId: examHsst.id, topicId: keralaRenaissanceTopic.id }, // Shared Topic!
            { examId: examHsst.id, topicId: teachingMethodologyTopic.id },
            { examId: examHsst.id, topicId: basicGrammarTopic.id },
            { examId: examHsst.id, topicId: literaryCriticismTopic.id },
        ],
    });

    // ==========================================
    // 5. QUESTION PAPERS
    // ==========================================
    const ldcPaper = await prisma.questionPaper.create({
        data: { title: 'LDC 2026 Comprehensive Mock 1', year: 2026, examId: examLdc.id },
    });

    const hsstPaper = await prisma.questionPaper.create({
        data: { title: 'HSST 2026 Previous Year Paper', year: 2025, examId: examHsst.id },
    });

    // ==========================================
    // 6. QUESTIONS
    // ==========================================

    // --- MATH QUESTIONS ---
    await prisma.question.create({
        data: {
            content: 'Find the next number in the series: 2, 6, 12, 20, ?',
            type: QuestionType.MCQ,
            difficulty: Difficulty.EASY,
            explanation: 'The differences are 4, 6, 8. The next difference is 10. So 20 + 10 = 30.',
            topicId: numberSeriesTopic.id,
            paperId: ldcPaper.id,
            options: { create: [{ text: '28', isCorrect: false }, { text: '30', isCorrect: true }, { text: '32', isCorrect: false }, { text: '36', isCorrect: false }] },
        },
    });

    // ADDED: Percentage Question for LDC
    await prisma.question.create({
        data: {
            content: 'A sum of money at simple interest amounts to Rs. 815 in 3 years and to Rs. 854 in 4 years. The sum is:',
            type: QuestionType.MCQ,
            difficulty: Difficulty.MEDIUM,
            explanation: 'S.I. for 1 year = 854 - 815 = Rs. 39. S.I. for 3 years = 39 * 3 = Rs. 117. Principal = 815 - 117 = Rs. 698.',
            topicId: percentageTopic.id,
            paperId: ldcPaper.id,
            options: { create: [{ text: 'Rs. 650', isCorrect: false }, { text: 'Rs. 690', isCorrect: false }, { text: 'Rs. 698', isCorrect: true }, { text: 'Rs. 700', isCorrect: false }] },
        },
    });

    await prisma.question.create({
        data: {
            content: 'Evaluate the integral of cos(x) dx.',
            type: QuestionType.MCQ,
            difficulty: Difficulty.MEDIUM,
            explanation: 'The integral of cos(x) is sin(x) + C.',
            topicId: calculusTopic.id,
            paperId: hsstPaper.id,
            options: { create: [{ text: '-sin(x) + C', isCorrect: false }, { text: 'sin(x) + C', isCorrect: true }, { text: '-cos(x) + C', isCorrect: false }, { text: 'tan(x) + C', isCorrect: false }] },
        },
    });

    // --- GK QUESTIONS ---
    await prisma.question.create({
        data: {
            content: 'Who founded the Sivagiri Mutt in 1904?',
            type: QuestionType.MCQ,
            difficulty: Difficulty.MEDIUM,
            explanation: 'Sree Narayana Guru founded the Sivagiri Mutt to promote his teachings of "One Caste, One Religion, One God for Man".',
            topicId: keralaRenaissanceTopic.id,
            paperId: ldcPaper.id, // Assigning to LDC paper for now, but it exists globally in the Renaissance topic
            options: { create: [{ text: 'Chattampi Swamikal', isCorrect: false }, { text: 'Ayyankali', isCorrect: false }, { text: 'Sree Narayana Guru', isCorrect: true }, { text: 'Mannathu Padmanabhan', isCorrect: false }] },
        },
    });

    await prisma.question.create({
        data: {
            content: 'Which article of the Indian Constitution deals with the Right to Constitutional Remedies?',
            type: QuestionType.MCQ,
            difficulty: Difficulty.MEDIUM,
            explanation: 'Article 32 allows citizens to approach the Supreme Court if fundamental rights are violated.',
            topicId: indianConstitutionTopic.id,
            paperId: ldcPaper.id,
            options: { create: [{ text: 'Article 14', isCorrect: false }, { text: 'Article 21', isCorrect: false }, { text: 'Article 32', isCorrect: true }, { text: 'Article 44', isCorrect: false }] },
        },
    });

    await prisma.question.create({
        data: {
            content: 'Which of the following is a student-centric teaching method?',
            type: QuestionType.MCQ,
            difficulty: Difficulty.EASY,
            explanation: 'Project-based learning centers around the student exploring real-world problems.',
            topicId: teachingMethodologyTopic.id,
            paperId: hsstPaper.id,
            options: { create: [{ text: 'Lecture Method', isCorrect: false }, { text: 'Demonstration Method', isCorrect: false }, { text: 'Project-Based Learning', isCorrect: true }, { text: 'Direct Instruction', isCorrect: false }] },
        },
    });

    // --- ENGLISH QUESTIONS ---
    await prisma.question.create({
        data: {
            content: 'Choose the correct article: She is ___ honest officer.',
            type: QuestionType.MCQ,
            difficulty: Difficulty.EASY,
            explanation: '"Honest" begins with a vowel sound (on-est), so we use "an".',
            topicId: basicGrammarTopic.id,
            paperId: ldcPaper.id,
            options: { create: [{ text: 'a', isCorrect: false }, { text: 'an', isCorrect: true }, { text: 'the', isCorrect: false }, { text: 'no article', isCorrect: false }] },
        },
    });

    // ADDED: Literary Criticism Question for HSST
    await prisma.question.create({
        data: {
            content: 'Who coined the term "Objective Correlative"?',
            type: QuestionType.MCQ,
            difficulty: Difficulty.HARD,
            explanation: 'T.S. Eliot popularized the term in his essay "Hamlet and His Problems" (1919).',
            topicId: literaryCriticismTopic.id,
            paperId: hsstPaper.id,
            options: { create: [{ text: 'Matthew Arnold', isCorrect: false }, { text: 'T.S. Eliot', isCorrect: true }, { text: 'I.A. Richards', isCorrect: false }, { text: 'F.R. Leavis', isCorrect: false }] },
        },
    });

    console.log('Seed completed successfully: Global categories and topics generated with completely mapped questions.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });