import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function actionErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ZodError) {
        return error.issues[0]?.message ?? "The submitted data is invalid.";
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const target = Array.isArray(error.meta?.target)
                ? error.meta.target.join(" ").toLowerCase()
                : String(error.meta?.target ?? "").toLowerCase();

            if (target.includes("categorynumber")) {
                return "That category code is already assigned to another exam.";
            }
            if (target.includes("slug")) {
                return "That URL slug is already in use. Choose a different name.";
            }
            if (target.includes("name")) {
                return "A record with that name already exists.";
            }
            return "A record with the same unique details already exists.";
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
        if (error.code === "P2034") {
            return "Another change was saved at the same time. Refresh and try again.";
        }
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
        return "Some submitted details are not valid. Check the form and try again.";
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
        return "The database is temporarily unavailable. Please try again shortly.";
    }
    return fallback;
}
