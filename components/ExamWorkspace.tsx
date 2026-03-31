"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FilterX, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import MiniNavbar from "./MiniNavbar";
import WorkspacePaperCard from "./WorkspacePaperCard";
import { exams } from "@/constants";

// Types remain the same as your provided code...
export interface Paper {
    id: number | string;
    title: string;
    type: string;
    year: string;
    duration: number;
    shift: string;
    pricing: string;
    subject: string;
}

export interface FilterOptions {
    years: string[];
    shifts: string[];
    pricing: string[];
    subjects: string[];
}

export interface TabOption {
    id: string;
    label: string;
    count?: number;
}

interface ExamWorkspaceProps {
    examId: string;
    examSlug: string;
    papers: Paper[];
    tabs: TabOption[];
    filterOptions: FilterOptions;
}

export default function ExamWorkspace({ examId, examSlug, papers = [], tabs = [], filterOptions }: ExamWorkspaceProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const isAdmin = true;

    const [filters, setFilters] = useState({
        years: [] as string[],
        shifts: [] as string[],
        pricing: [] as string[],
        subjects: [] as string[],
    });

    const activeCount = Object.values(filters).flat().length;

    const toggleFilter = (category: keyof typeof filters, value: string) => {
        setFilters((prev) => {
            const currentList = prev[category];
            const isSelected = currentList.includes(value);
            return {
                ...prev,
                [category]: isSelected
                    ? currentList.filter((item) => item !== value)
                    : [...currentList, value],
            };
        });
    };

    const clearAllFilters = () => {
        setFilters({ years: [], shifts: [], pricing: [], subjects: [] });
    };

    // Memoize filtering for performance as the list grows
    const filteredPapers = useMemo(() => {
        return papers.filter((paper) => {
            const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase());

            // Tab Logic: matches "all" or specific type (PYQ/Mock/Topic)
            const matchesTab = activeTab === "all" ||
                paper.type.toLowerCase() === activeTab.toLowerCase();

            const matchesYear = filters.years.length === 0 || filters.years.includes(paper.year);
            const matchesShift = filters.shifts.length === 0 || filters.shifts.includes(paper.shift);
            const matchesPricing = filters.pricing.length === 0 || filters.pricing.includes(paper.pricing);
            const matchesSubject = filters.subjects.length === 0 || filters.subjects.includes(paper.subject);

            return matchesSearch && matchesTab && matchesYear && matchesShift && matchesPricing && matchesSubject;
        });
    }, [papers, searchQuery, activeTab, filters]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start w-full">
            {/* LEFT SIDEBAR: FILTERS */}
            <aside className="w-full lg:w-[320px] shrink-0 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 lg:sticky lg:top-8">
                <div className="mb-8">
                    <h3 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Search</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Find a paper..."
                            className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-slate-900 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Filters</h3>
                            {activeCount > 0 && (
                                <Badge className="bg-slate-900 text-[10px] h-5 px-1.5 rounded-md">
                                    {activeCount}
                                </Badge>
                            )}
                        </div>
                        {activeCount > 0 && (
                            <button onClick={clearAllFilters} className="text-[10px] font-black uppercase text-red-500 hover:underline">
                                Reset
                            </button>
                        )}
                    </div>

                    <ScrollArea className="h-[calc(100vh-450px)] min-h-[300px] pr-4">
                        <Accordion type="multiple" defaultValue={["years", "subjects"]} className="w-full">
                            {(Object.keys(filterOptions) as Array<keyof typeof filterOptions>).map((category) => (
                                <AccordionItem key={category} value={category} className="border-b-0">
                                    <AccordionTrigger className="hover:no-underline py-3 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                                        {category}
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4">
                                        <div className="flex flex-col gap-2.5">
                                            {filterOptions[category]?.map((option) => (
                                                <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                                                    <Checkbox
                                                        checked={filters[category].includes(option)}
                                                        onCheckedChange={() => toggleFilter(category, option)}
                                                        className="border-slate-300 data-[state=checked]:bg-slate-900 rounded-md"
                                                    />
                                                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                                                        {option}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </ScrollArea>
                </div>
            </aside>

            {/* MAIN CONTENT: TABS & CARDS */}
            <section className="flex-1 min-w-0 w-full">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* sticky sub-nav */}
                    <div className="sticky top-0 z-20 mb-8 bg-slate-50/80 backdrop-blur-md py-4">
                        <MiniNavbar tabs={tabs} activeTab={activeTab} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPapers.length > 0 ? (
                            filteredPapers.map((paper) => (
                                <WorkspacePaperCard
                                    key={paper.id}
                                    {...paper}
                                    examId={examId}
                                    examSlug={examSlug}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-20 bg-white border border-slate-200 border-dashed rounded-[2rem] flex flex-col items-center text-center">
                                <FilterX className="w-12 h-12 text-slate-200 mb-4" />
                                <h3 className="text-lg font-black text-slate-900">No match found</h3>
                                <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">
                                    Try adjusting your search or filters
                                </p>
                            </div>
                        )}
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/library/exam/${examSlug}/paper/new?examId=${examId}`}
                            className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
                            title="Add New Question Paper"
                        >
                            <Plus className="w-6 h-6" size={16} />
                        </Link>
                    )}
                </Tabs>
            </section>
        </div>
    );
}