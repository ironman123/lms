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


import { PrismaClient } from '@prisma/client';
import { defineConfig, env } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
    return new PrismaClient({ log: ["query"], });
};

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// This 'db' or 'prisma' variable is what you will import elsewhere
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;