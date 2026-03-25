"use client";

import { Trophy, Clock, LayoutGrid } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

interface SyllabusItem {
    category: string;
    topics: string[];
}

interface ExamCarouselCardProps {
    name: string;
    description?: string; // Added back
    tags?: string[];      // Added back
    categoryName?: string;
    accentColor?: string | null;
    totalMarks: number;
    duration: number;
    syllabus: SyllabusItem[];
}

const ExamCarouselCard = ({
    name,
    description,
    tags = [],
    categoryName = "Category",
    accentColor = "#1D3557",
    totalMarks,
    duration,
    syllabus,
}: ExamCarouselCardProps) => {
    return (
        <Card className="overflow-hidden border-slate-200 shadow-2xl bg-white rounded-[2rem] w-full max-w-[400px]">
            {/* 1. DARK HEADER AREA (Compact) */}
            <div
                className="p-6 text-white relative overflow-hidden rounded-t-[2rem] transition-all duration-700 ease-in-out"
                style={{
                    // Use backgroundImage for the gradient
                    backgroundImage: `linear-gradient(135deg, #0F172A 0%, ${accentColor}33 240%)`,
                    // Use backgroundColor for the solid base
                    backgroundColor: "#0F172A"
                }}
            >
                {/* Refined Corner Glow (reduced opacity for balance) */}
                <div
                    className="absolute -top-16 -right-16 w-36 h-36 blur-[60px] opacity-90 rounded-full transition-colors duration-700"
                    style={{ backgroundColor: accentColor }}
                />

                <div className="flex justify-between items-center mb-4 relative z-10">
                    <span
                        className="px-2.5 py-0.5 rounded-md bg-white/10 border text-[9px] font-black uppercase tracking-widest transition-all duration-500"
                        style={{ borderColor: `${accentColor}60` }}
                    >
                        {categoryName}
                    </span>
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Trophy size={14} />
                        <span className="text-xs">{totalMarks || 0} Marks</span>
                    </div>
                </div>

                <h2 className="text-xl font-black mb-1 leading-tight relative z-10 truncate">
                    {name || "Exam Title"}
                </h2>

                {/* Description Snippet */}
                <p className="text-[11px] text-slate-300 line-clamp-2 mb-4 relative z-10 leading-relaxed max-w-[90%]">
                    {description || "No description provided."}
                </p>

                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3 text-slate-300 text-[10px] font-black uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                            <Clock size={12} /> {duration || 0}m
                        </div>
                        <div className="flex items-center gap-1">
                            <LayoutGrid size={12} /> {syllabus.length}s
                        </div>
                    </div>

                    {/* Compact Tags */}
                    <div className="flex gap-1">
                        {tags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. SYLLABUS AREA (Compact Carousel) */}
            <div className="p-6">
                <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.25em] mb-4">
                    Syllabus Explorer
                </h4>

                <Carousel className="w-full">
                    <CarouselContent>
                        {syllabus.map((section, i) => (
                            <CarouselItem key={i}>
                                <div className="p-0.5">
                                    <div className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-3 border-b border-slate-200 bg-white flex justify-between items-center">
                                            <h5 className="text-xs font-black text-slate-800 truncate max-w-[150px]">
                                                {section.category || "Untitled"}
                                            </h5>
                                            <p className="text-[10px] font-black uppercase tracking-tighter" style={{ color: accentColor }}>
                                                Sec {i + 1}
                                            </p>
                                        </div>

                                        <div className="p-3 h-[140px] overflow-y-auto custom-scrollbar">
                                            <div className="flex flex-wrap gap-1.5">
                                                {section.topics.length > 0 && section.topics[0] !== "" ? (
                                                    section.topics.map((topic, j) => topic && (
                                                        <span key={j} className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm">
                                                            {topic}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-slate-300 italic">No topics...</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>

                    <div className="flex justify-center gap-3 mt-4">
                        <CarouselPrevious className="static translate-y-0 h-8 w-8 border-slate-200 shadow-none" />
                        <CarouselNext className="static translate-y-0 h-8 w-8 border-slate-200 shadow-none" />
                    </div>
                </Carousel>
            </div>
        </Card>
    );
};

export default ExamCarouselCard;