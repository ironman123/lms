const paper = await prisma.questionPaper.findUnique({
    where: { id: paperId },
    include: {
        exam: true,
        questions: {
            include: {
                options: {
                    select: {
                        id: true,
                        text: true,
                        // isCorrect is NOT selected here for security!
                    }
                },
                topic: {
                    include: { category: true }
                }
            }