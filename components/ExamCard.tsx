import Image from "next/image";
import Link from "next/link";

interface ExamCardProps {
    id: string;
    name: string;
    description: string;
    tags: string[];
    duration: number; // in minutes
    totalMarks: number;
    color: string; // hex code or color name
}

const ExamCard = ({ id, name, description, tags, duration, totalMarks, color }: ExamCardProps) => {
    return (
        <article className="exam-card" style={{ backgroundColor: color }}>
            <div className="flex justify-between items-center">
                <div className="flex gap-1 items-center">
                    {tags.map((tag, index) => (
                        <div key={index} className="tag-badge">
                            {tag}
                        </div>
                    ))}
                </div>
                <button className="exam-bookmark">
                    <Image src="/icons/bookmark.svg" alt="Bookmark" width={12} height={15} />
                </button>
            </div>
            <h2 className="text-2xl font-bold">{name}</h2>
            <p className="text-sm">{description}</p>
            <div className="flex items-center gap-1.5">
                <Image src="/icons/clock.svg" alt="duration" width={12} height={12} />
                <p className="text-sm font-bold">{duration} min</p>
                <p className="ml-auto text-sm font-bold">Total Marks: {totalMarks}</p>
            </div>
            <Link href={`/library/exam/${name}`} className="text-center mt-0 block w-full bg-black text-white rounded-4xl text-sm px-2 py-1">
                View Details
            </Link>
        </article >
    )
}

export default ExamCard