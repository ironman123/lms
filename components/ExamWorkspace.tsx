"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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

// 1. Define the Types for the data we expect to receive
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

// 2. Add them to the Component Props
interface ExamWorkspaceProps {
    examId: string;
    papers: Paper[];
    tabs: TabOption[];
    filterOptions: FilterOptions;
}

export default function ExamWorkspace({ examId, papers, tabs, filterOptions }: ExamWorkspaceProps) {
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

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

    // 3. Filter using the passed-in `papers` array instead of hardcoded data
    const filteredPapers = papers.filter((paper) => {
        const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || paper.type.toLowerCase() === activeTab.toLowerCase();

        const matchesYear = filters.years.length === 0 || filters.years.includes(paper.year);
        const matchesShift = filters.shifts.length === 0 || filters.shifts.includes(paper.shift);
        const matchesPricing = filters.pricing.length === 0 || filters.pricing.includes(paper.pricing);
        const matchesSubject = filters.subjects.length === 0 || filters.subjects.includes(paper.subject);

        return matchesSearch && matchesTab && matchesYear && matchesShift && matchesPricing && matchesSubject;
    });

    return (
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start w-full">
            <aside className="w-full lg:w-3/12 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 lg:sticky lg:top-8">
                {/* Search Input Area */}
                <div className="mb-6">
                    <h3 className="font-bold text-slate-900 mb-3 text-lg tracking-tight">Search</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search papers..."
                            className="pl-9 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-slate-900 focus-visible:ring-2 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filters Area */}
                <div className="flex flex-col ">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-lg tracking-tight">Filters</h3>
                            {activeCount > 0 && (
                                <Badge variant="secondary" className="bg-slate-900 text-white hover:bg-slate-800">
                                    {activeCount}
                                </Badge>
                            )}
                        </div>
                        {activeCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-slate-500 hover:text-red-600 h-8 px-2 text-xs hover:bg-red-50 rounded-lg">
                                Clear All
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="h-[400px] pr-4 mt-2">
                        <Accordion type="multiple" defaultValue={["item-year", "item-subject"]} className="w-full">
                            {/* 4. Use the passed-in filterOptions */}
                            {(Object.keys(filterOptions) as Array<keyof typeof filterOptions>).map((category) => (
                                <AccordionItem key={category} value={`item-${category}`} className="border-b-0 mb-1">
                                    <AccordionTrigger className="hover:no-underline py-3 text-sm font-bold text-slate-800 capitalize tracking-tight">
                                        {category}
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-1 pb-3">
                                        <div className="flex flex-col gap-3">
                                            {filterOptions[category].map((option) => (
                                                <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                                                    <Checkbox
                                                        checked={filters[category].includes(option)}
                                                        onCheckedChange={() => toggleFilter(category, option)}
                                                        className="data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 rounded-[4px]"
                                                    />
                                                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
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

            <section className="flex-1 min-w-0 w-full">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="relative lg:sticky lg:top-8 z-20 mb-6 bg-slate-50 py-2 -my-2">
                        <div className="absolute -top-8 left-0 w-full h-8 bg-gradient-to-b from-slate-50/0 to-slate-50 pointer-events-none" />
                        <div className="overflow-x-auto hide-scrollbar w-full relative z-10">
                            {/* 5. Pass the tabs prop down */}
                            <MiniNavbar tabs={tabs} activeTab={activeTab} />
                        </div>
                        <div className="absolute -bottom-6 left-0 w-full h-6 bg-gradient-to-b from-slate-50 to-slate-50/0 pointer-events-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPapers.length > 0 ? (
                            filteredPapers.map((paper) => (
                                <WorkspacePaperCard
                                    key={paper.id}
                                    id={paper.id}
                                    title={paper.title}
                                    type={paper.type}
                                    year={paper.year}
                                    pricing={paper.pricing}
                                    examId={examId}
                                    subject={paper.subject}
                                    duration={paper.duration}
                                    shift={paper.shift}
                                />
                            ))
                        ) : (
                            <div className="col-span-full p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-white">
                                <Search className="w-10 h-10 text-slate-300 mb-4 mx-auto" />
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">No papers found</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                                    We couldn't find anything matching your current filters. Try removing some filters or adjusting your search.
                                </p>
                                {activeCount > 0 && (
                                    <Button variant="outline" className="mt-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50" onClick={clearAllFilters}>
                                        Clear all filters
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </Tabs>
            </section>
        </div>
    );
}