export type QuestionListItem = {
    clientId: string;
    number: number;
};

function renumber<T extends QuestionListItem>(questions: T[]): T[] {
    return questions.map((question, index) => ({
        ...question,
        number: index + 1,
    }));
}

export function appendQuestion<T extends QuestionListItem>(
    questions: T[],
    question: T
): T[] {
    return renumber([...questions, question]);
}

export function updateQuestionByClientId<T extends QuestionListItem>(
    questions: T[],
    clientId: string,
    updated: T
): T[] {
    return questions.map((question) =>
        question.clientId === clientId ? updated : question
    );
}

export function removeQuestionByClientId<T extends QuestionListItem>(
    questions: T[],
    clientId: string
): T[] {
    return renumber(
        questions.filter((question) => question.clientId !== clientId)
    );
}
