import Link from "next/link";
import { Clock, Bookmark } from "lucide-react";

interface WorkspacePaperCardProps {
    id: string | number;
    title: string;
    type: string;
    year: string;
    pricing: string;
    examId: string;
    examSlug: string;
    subject: string;
    duration: number;
    shift: string;
    color?: string; // Allows the button and top border to match the parent Exam's theme color
}

const WorkspacePaperCard = ({
    id,
    title,
    type,
    year,
    examSlug,
    pricing,
    examId,
    subject,
    duration,
    shift,
    color = "#0F172A" // Fallback to slate-900 if no color is provided
}: WorkspacePaperCardProps) => {

    return (
        <article
            className="group relative w-85 flex flex-col p-6 bg-white border border-slate-100 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:border-transparent"
            style={{ borderTop: `4px solid ${color}` }} // Matches ExamCard subtle color accent
        >
            {/* Header: Tags & Bookmark */}
            <div className="flex justify-between items-start mb-5">
                <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600">
                        {type}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600">
                        {year}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${pricing === "Free"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                        }`}>
                        {pricing}
                    </span>
                </div>
                <button className="p-1.5 rounded-full hover:bg-slate-50 transition-colors">
                    <Bookmark size={16} strokeWidth={1.5} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 mb-6">
                <h2 className="text-xl font-extrabold text-slate-800 leading-tight mb-2 uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                    {title}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {type} • {subject}
                </p>
            </div>

            {/* Meta Info (Duration, Shift) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock size={14} strokeWidth={1.5} className="opacity-60" />
                    <span className="text-xs font-semibold">{duration} min</span>
                </div>
                <div className="text-xs font-bold text-slate-400">
                    {shift}
                </div>
            </div>

            {/* Action Button: Matches ExamCard style */}
            <Link
                href={`/library/paper/${id}`} // Adjust this route to wherever the actual test takes place
                className="flex items-center justify-center w-full mt-4 py-2.5 text-white text-xs font-bold rounded-xl transition-all hover:brightness-150 group-hover:shadow-lg group-hover:shadow-slate-200"
                style={{ backgroundColor: color }}
            >
                Start Paper
            </Link>
        </article>

    );
};

export default WorkspacePaperCard;