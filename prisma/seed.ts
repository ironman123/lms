import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting seed...')

    // 1. Clear existing data to avoid duplicates during testing
    //await prisma.topic.deleteMany()
    //await prisma.category.deleteMany()
    //await prisma.exam.deleteMany()

    await prisma.exam.create({
        data: {
            name: "Kerala PSC",
            description: "Kerala Public Service Commission - State Level Civil Services",
            duration: 75, // Standard Prelims duration is 75-90 mins
            totalMarks: 100,
            color: "#E2F0CB", // Light Green theme
            categories: {
                create: [
                    {
                        name: "History & Geography",
                        topics: {
                            create: [
                                { name: "Kerala History & Renaissance" },
                                { name: "Indian Independence Movement" },
                                { name: "Physical Geography of Kerala" }
                            ]
                        }
                    },
                    {
                        name: "Civics & Governance",
                        topics: {
                            create: [
                                { name: "Indian Constitution" },
                                { name: "Social Welfare Schemes" },
                                { name: "Panchayati Raj in Kerala" }
                            ]
                        }
                    },
                    {
                        name: "General Science & IT",
                        topics: {
                            create: [
                                { name: "Human Body & Health" },
                                { name: "Physics & Chemistry Basics" },
                                { name: "Cyber Law & IT Act" }
                            ]
                        }
                    },
                    {
                        name: "Language & Math",
                        topics: {
                            create: [
                                { name: "Mental Ability & Arithmetic" },
                                { name: "General English Grammar" },
                                { name: "Malayalam / Regional Language" }
                            ]
                        }
                    }
                ]
            }
        }
    })

    await prisma.exam.create({
        data: {
            name: "IELTS Academic",
            description: "English proficiency test for higher education and professional registration",
            duration: 165, // Approx 2h 45m
            totalMarks: 9,   // Band scale
            color: "#FFC1CC", // Soft Red/Pink theme
            categories: {
                create: [
                    {
                        name: "Listening",
                        topics: {
                            create: [
                                { name: "Everyday Social Conversation" },
                                { name: "Monologue (Local Facilities/Context)" },
                                { name: "Educational/Training Discussion" },
                                { name: "Academic Lecture" }
                            ]
                        }
                    },
                    {
                        name: "Reading",
                        topics: {
                            create: [
                                { name: "Descriptive and Factual Texts" },
                                { name: "Discursive and Analytical Passages" },
                                { name: "Identifying Information (True/False/Not Given)" }
                            ]
                        }
                    },
                    {
                        name: "Writing",
                        topics: {
                            create: [
                                { name: "Task 1: Data Interpretation (Graphs/Charts)" },
                                { name: "Task 2: Argumentative Essay" }
                            ]
                        }
                    },
                    {
                        name: "Speaking",
                        topics: {
                            create: [
                                { name: "Part 1: Introduction and Interview" },
                                { name: "Part 2: Individual Long Turn (Cue Card)" },
                                { name: "Part 3: Two-way Abstract Discussion" }
                            ]
                        }
                    }
                ]
            }
        }
    })


    console.log('Seed finished successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })