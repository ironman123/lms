// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        seed: "node -r dotenv/config prisma/seed.ts dotenv_config_path=.env.local",
    },
    datasource: {
        // This is used for npx prisma migrate and npx prisma db push
        directUrl: process.env.DIRECT_URL!,
        url: process.env.DATABASE_URL!,
        // This is required for Supabase/Neon users
    },
});
