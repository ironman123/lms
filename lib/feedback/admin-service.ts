import "server-only";

import prisma from "@/lib/prisma";

export async function getNewAppFeedbackCount() {
    return prisma.appFeedback.count({ where: { status: "NEW" } });
}
