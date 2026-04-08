// scripts/fix-slugs.ts
import prisma from "../lib/prisma";
import * as dotenv from "dotenv";
dotenv.config();

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[;,|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
}

async function main() {
    const exams = await prisma.exam.findMany({ select: { id: true, name: true, slug: true } });

    let fixed = 0;
    for (const exam of exams)
    {
        const newSlug = generateSlug(exam.name);
        if (newSlug !== exam.slug)
        {
            console.log(`Fixing: "${exam.slug}" → "${newSlug}"`);
            await prisma.exam.update({ where: { id: exam.id }, data: { slug: newSlug } });
            fixed++;
        }
    }
    console.log(`Fixed ${fixed} slugs`);
}

main().catch(console.error).finally(() => prisma.$disconnect());