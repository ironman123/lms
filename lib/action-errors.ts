import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function actionErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ZodError) {
        return error.issues[0]?.message ?? "The submitted data is invalid.";
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return "A record with the same name, slug, or category number already exists.";
        }
        if (error.code === "P2003") {
            return "One of the selected categories or exams no longer exists. Refresh and try again.";
        }
        if (error.code === "P2022") {
            return "The database schema is out of date. Apply pending migrations and try again.";
        }
        if (error.code === "P2025") {
            return "The record no longer exists. Refresh and try again.";
        }
    }
    return fallback;
}
