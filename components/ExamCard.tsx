import Image from "next/image";
import Link from "next/link";
import { Clock, Star, Bookmark } from "lucide-react"; // Matching Lucide style

interface ExamCardProps {
    id: string;
    name: string;
    description: string;
    tags: string[];
    duration: number; // in minutes
    totalMarks: number;
    color: string; // hex code or color name (e.g., #1D3557)
}

const ExamCard = ({ id, name, description, tags, duration, totalMarks, color }: ExamCardProps) => {
    return (
        <article
            className="group relative flex flex-col p-6 bg-white border border-slate-100 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:border-transparent"
            style={{ borderTop: `4px solid ${color}` }} // Subtle color accent
        >
            {/* Header: Tags & Bookmark */}
            <div className="flex justify-between items-start mb-5">
                <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <button className="p-1.5 rounded-full hover:bg-slate-50 transition-colors">
                    <Bookmark size={16} strokeWidth={1.5} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 mb-6">
                <h2 className="text-xl font-extrabold text-slate-800 leading-tight mb-2 uppercase tracking-tight">
                    {name}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {description}
                </p>
            </div>

            {/* Meta Info (Duration, Marks) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock size={14} strokeWidth={1.5} className="opacity-60" />
                    <span className="text-xs font-semibold">{duration} min</span>
                </div>
                <div className="text-xs font-bold text-slate-400">
                    {totalMarks} Marks
                </div>
            </div>

            {/* Action Button: Color matches the top accent */}
            <Link
                href={`/library/paper`}
                className="flex items-center justify-center w-full mt-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl transition-all hover:brightness-100 group-hover:shadow-lg group-hover:shadow-slate-200"
                style={{ backgroundColor: color }} // Button matches brand color
            >
                View Details
            </Link>
        </article>
    );
};

export default ExamCard;