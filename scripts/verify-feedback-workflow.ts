import prisma from "../lib/prisma";

async function main() {
    const [counts, workedWithoutAcknowledgement] = await Promise.all([
        prisma.appFeedback.groupBy({
            by: ["status"],
            _count: { _all: true },
        }),
        prisma.appFeedback.count({
            where: {
                status: {
                    in: [
                        "ACKNOWLEDGED",
                        "IN_REVIEW",
                        "PLANNED",
                        "RESOLVED",
                        "CLOSED",
                    ],
                },
                acknowledgedAt: null,
            },
        }),
    ]);

    if (workedWithoutAcknowledgement > 0) {
        throw new Error(
            `${workedWithoutAcknowledgement} worked feedback tickets are missing acknowledgement metadata.`
        );
    }

    console.log(
        JSON.stringify(
            {
                counts: Object.fromEntries(
                    counts.map((item) => [item.status, item._count._all])
                ),
                workedWithoutAcknowledgement,
            },
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
