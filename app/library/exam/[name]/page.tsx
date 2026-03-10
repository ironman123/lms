import SyllabusDropdown from "@/components/SyllabusDropdown";

interface PageProps {
    params: Promise<{
        name: string; // The framework automatically extracts "GATE" from the URL
    }>
}

const Exam = async ({ params }: PageProps) => {
    const resolvedParams = await params;
    const examName = decodeURIComponent(resolvedParams.name);
    return (
        <div className="m-4 ml-9">
            <h1>{examName}</h1>
            <SyllabusDropdown
                data={[
                    {
                        category: "Mathematics",
                        topics: ["Algebra", "Calculus", "Geometry"]
                    },
                    {
                        category: "Physics",
                        topics: ["Mechanics", "Thermodynamics", "Electromagnetism"]
                    },

                ]}
            />
        </div>
    )
}

export default Exam