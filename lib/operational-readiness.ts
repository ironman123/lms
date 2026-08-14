export type OperationalCheck = {
    key: string;
    label: string;
    required: boolean;
    configured: boolean;
    guidance: string;
};

const CHECKS = [
    ["DATABASE_URL", "Primary database", true, "Set the pooled Supabase PostgreSQL connection string."],
    ["DIRECT_URL", "Migration database", true, "Set the direct Supabase PostgreSQL connection string."],
    ["UPSTASH_REDIS_REST_URL", "Redis cache and rate limits", true, "Connect the production Upstash Redis database."],
    ["UPSTASH_REDIS_REST_TOKEN", "Redis cache and rate limits", true, "Add the matching Upstash Redis token."],
    ["QSTASH_TOKEN", "Background delivery queue", true, "Add the Upstash QStash token."],
    ["QSTASH_CURRENT_SIGNING_KEY", "Background delivery queue", true, "Add QStash's current signing key."],
    ["QSTASH_NEXT_SIGNING_KEY", "Background delivery queue", true, "Add QStash's next signing key."],
    ["APP_URL", "Canonical application URL", true, "Set the public HTTPS deployment URL."],
    ["CRON_SECRET", "Scheduled maintenance", true, "Set a strong secret shared with Vercel Cron."],
    ["VAPID_EMAIL", "Web push", false, "Set a contact email before enabling browser push."],
    ["VAPID_PUBLIC_KEY", "Web push", false, "Generate and add the VAPID public key."],
    ["VAPID_PRIVATE_KEY", "Web push", false, "Generate and add the VAPID private key."],
] as const;

export function getOperationalReadiness(environment: Record<string, string | undefined> = process.env) {
    const checks: OperationalCheck[] = CHECKS.map(([key, label, required, guidance]) => ({
        key, label, required, configured: Boolean(environment[key]?.trim()), guidance,
    }));
    const missingRequired = checks.filter((check) => check.required && !check.configured);
    return { ready: missingRequired.length === 0, missingRequired: missingRequired.map((check) => check.key), checks };
}
