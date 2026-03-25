"use client";

import { Trophy, Clock, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    categoryName?: string;
    accentColor?: string;
    totalMarks: number;
    duration: number;
    syllabus: SyllabusItem[];
}

const ExamCarouselCard = ({
    name,
    categoryName = "Category",
    accentColor = "#1D3557",
    totalMarks,
    duration,
    syllabus,
}: ExamCarouselCardProps) => {
    return (
        <Card className="overflow-hidden border-slate-200 shadow-2xl bg-white rounded-[2rem] w-full max-w-[400px]">
            {/* 1. DARK HEADER AREA */}
            <div className="bg-[#0F172A] p-8 text-white relative overflow-hidden">
                {/* Visual Glow Effect */}
                <div
                    className="absolute -top-20 -right-20 w-40 h-40 blur-[80px] opacity-50 rounded-full"
                    style={{ backgroundColor: accentColor }}
                />

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <span
                        className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-widest transition-colors duration-500"
                        style={{
                            borderColor: `${accentColor}60` // Optional: Makes the border a 20% transparent version of the accent color
                        }}
                    >
                        {categoryName || "General"}
                    </span>
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <Trophy size={16} />
                        <span className="text-sm">{totalMarks || 0} Marks</span>
                    </div>
                </div>

                <h2 className="text-2xl font-black mb-4 leading-tight relative z-10 break-words">
                    {name || "Exam Title"}
                </h2>

                <div className="flex items-center gap-4 text-slate-400 text-[11px] font-black uppercase tracking-wider relative z-10">
                    <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-500" /> {duration || 0} Mins
                    </div>
                    <div className="flex items-center gap-1.5">
                        <LayoutGrid size={14} className="text-slate-500" /> {syllabus.length} Sections
                    </div>
                </div>
            </div>

            {/* 2. SYLLABUS AREA (THE FLIPPING INTERFACE) */}
            <div className="p-8">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] mb-6">
                    Syllabus Explorer
                </h4>

                <Carousel className="w-full">
                    <CarouselContent>
                        {syllabus.map((section, i) => (
                            <CarouselItem key={i}>
                                <div className="p-1">
                                    <div className="border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden shadow-sm">
                                        {/* Inner Header */}
                                        <div className="p-4 border-b border-slate-200 bg-white">
                                            <p
                                                className="text-[10px] font-black uppercase mb-1 tracking-wider"
                                                style={{ color: accentColor }}
                                            >
                                                Section {i + 1}
                                            </p>
                                            <h5 className="text-sm font-black text-slate-800 truncate">
                                                {section.category || "Untitled Section"}
                                            </h5>
                                        </div>

                                        {/* Inner Content - Fixed Height */}
                                        <div className="p-4 h-[180px] overflow-y-auto custom-scrollbar">
                                            <div className="flex flex-wrap gap-2">
                                                {section.topics.length > 0 && section.topics[0] !== "" ? (
                                                    section.topics.map((topic, j) => topic && (
                                                        <span
                                                            key={j}
                                                            className="text-[11px] font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-sm"
                                                        >
                                                            {topic}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-[11px] text-slate-300 italic font-medium">
                                                        No topics added yet...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>

                    {/* Navigation Buttons */}
                    <div className="flex justify-center gap-4 mt-6">
                        <CarouselPrevious className="static translate-y-0 h-10 w-10 border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all active:scale-95" />
                        <CarouselNext className="static translate-y-0 h-10 w-10 border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all active:scale-95" />
                    </div>
                </Carousel>
            </div>
        </Card>
    );
};

export default ExamCarouselCard;