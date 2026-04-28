// import "dotenv/config";
// import { defineConfig, env } from "prisma/config";

// // lib/prisma.ts
// import { PrismaClient } from '@prisma/client';

// // 1. This prevents multiple instances of Prisma Client in development
// const globalForPrisma = global as unknown as { prisma: PrismaClient };

// // 2. We verify the environment variable exists
// if (!process.env.DATABASE_URL)
// {
//     throw new Error("DATABASE_URL is missing from .env");
// }
// if (!process.env.DIRECT_URL)
// {
//     throw new Error("DIRECT_URL is missing from .env");
// }

// export default defineConfig({
//     schema: "prisma/schema.prisma",
//     datasource: {
//         url: env("DATABASE_URL"),
//         // In Prisma 6, directUrl is handled via the config as well
//         directUrl: env("DIRECT_URL"),
//     },
// });


// import { PrismaClient } from '@prisma/client';
// const databaseUrl = process.env.DATABASE_URL;

// const prismaClientSingleton = () => {
//     return new PrismaClient({ log: ["query"], });
// };

// declare global {
//     var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
// }

// // This 'db' or 'prisma' variable is what you will import elsewhere
// const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// export default prisma;

// if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;


import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { Prisma } from "@prisma/client";


const connectionString = `${process.env.DATABASE_URL}`

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter, // ✅ Pass the adapter here instead of the URL in the schema
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError)
    {
        switch (error.code)
        {
            case "P2025":
                throw new Error("Record not found.");
            case "P2003":
                throw new Error("Referenced record does not exist.");
            case "P2002":
                throw new Error("A record with this value already exists.");
            default:
                throw new Error(`Database error: ${error.code}`);
        }
    }
    throw error;
}

export default prisma