import SyllabusDropdown from "@/components/SyllabusDropdown";

import { exams } from "@/constants/index";

interface PageProps {
    params: Promise<{
        name: string; // The framework automatically extracts "GATE" from the URL
    }>
}

const Exam = async ({ params }: PageProps) => {
    const resolvedParams = await params;
    const examName = decodeURIComponent(resolvedParams.name);
    const currentExam = exams.find((exam) => exam.name === examName);
    return (
        <div className="m-4 ml-9">
            <h1>{examName}</h1>
            <section className="mt-6 mr-4">
                <SyllabusDropdown
                    data={currentExam?.syllabus || []} //static data
                />
            </section>

            <section className="mt-6 mr-4">

            </section>

        </div>
    )
}

export default Exam