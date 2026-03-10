"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

// 1. Mock data updated with properties to match our new filters
const data = [
    { id: 1, title: "2024 Session 1", type: "PYQ", year: "2024", duration: 180, shift: "Morning Shift", pricing: "Free", subject: "Mathematics" },
    { id: 2, title: "Full Syllabus Mock 1", type: "Mock", year: "2024", duration: 180, shift: "Evening Shift", pricing: "Paid", subject: "Physics" },
    { id: 3, title: "2023 Shift 2", type: "PYQ", year: "2023", duration: 180, shift: "Evening Shift", pricing: "Free", subject: "Chemistry" },
    { id: 4, title: "Chapter-wise: Mechanics", type: "Topic", year: "2022", duration: 60, shift: "Morning Shift", pricing: "Free", subject: "Physics" },
    { id: 5, title: "Chapter-wise: Mechanics", type: "Topic", year: "2022", duration: 60, shift: "Morning Shift", pricing: "Free", subject: "Physics" },
    { id: 6, title: "Chapter-wise: Mechanics", type: "Topic", year: "2022", duration: 60, shift: "Morning Shift", pricing: "Free", subject: "Physics" },
];

// 2. The options that will appear in our accordion filters
const FILTER_OPTIONS = {
    years: ["2025", "2024", "2023", "2022", "2021"],
    shifts: ["Morning Shift", "Evening Shift"],
    pricing: ["Free", "Paid"],
    subjects: ["General Knowledge", "Current Affairs", "Mathematics", "Physics", "Chemistry"],
};

export default function ExamWorkspace({ examName }: { examName: string }) {
    // --- STATE ---
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // State for the advanced sidebar filters
    const [filters, setFilters] = useState({
        years: [] as string[],
        shifts: [] as string[],
        pricing: [] as string[],
        subjects: [] as string[],
    });

    // --- FILTER LOGIC ---
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

    // The master filter function combining Search, Tabs, and Checkboxes
    const filteredPapers = data.filter((paper) => {
        const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || paper.type.toLowerCase() === activeTab.toLowerCase();

        const matchesYear = filters.years.length === 0 || filters.years.includes(paper.year);
        const matchesShift = filters.shifts.length === 0 || filters.shifts.includes(paper.shift);
        const matchesPricing = filters.pricing.length === 0 || filters.pricing.includes(paper.pricing);
        const matchesSubject = filters.subjects.length === 0 || filters.subjects.includes(paper.subject);

        return matchesSearch && matchesTab && matchesYear && matchesShift && matchesPricing && matchesSubject;
    });

    return (
        <section className="mt-6 mr-4 flex gap-6 md:flex-row flex-col items-start">

            {/* --- LEFT SIDEBAR: Search & Filters --- */}
            <section className="md:w-4/12 flex flex-col gap-6 border border-gray-200 rounded-lg bg-white px-6 py-6 sticky top-6">

                {/* Search */}
                <div>
                    <h3 className="font-semibold mb-3 text-lg">Search</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search papers..."
                            className="pl-9 bg-gray-50 focus-visible:ring-amber-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">Filters</h3>
                            {activeCount > 0 && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                                    {activeCount}
                                </Badge>
                            )}
                        </div>
                        {activeCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="text-gray-500 hover:text-red-600 h-8 px-2 text-xs hover:bg-red-100"
                            >
                                Clear All
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="h-[400px] pr-4 mt-2">
                        <Accordion type="multiple" defaultValue={["item-year", "item-subject"]} className="w-full">

                            {/* YEAR */}
                            <AccordionItem value="item-year" className="border-b-0 mb-1">
                                <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-gray-700">Year</AccordionTrigger>
                                <AccordionContent className="pt-1 pb-3">
                                    <div className="flex flex-col gap-3">
                                        {FILTER_OPTIONS.years.map((year) => (
                                            <label key={year} className="flex items-center space-x-3 cursor-pointer group">
                                                <Checkbox
                                                    checked={filters.years.includes(year)}
                                                    onCheckedChange={() => toggleFilter("years", year)}
                                                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                />
                                                <span className="text-sm text-gray-600 group-hover:text-black">{year}</span>
                                            </label>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* SHIFT */}
                            <AccordionItem value="item-shift" className="border-b-0 mb-1">
                                <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-gray-700">Shift</AccordionTrigger>
                                <AccordionContent className="pt-1 pb-3">
                                    <div className="flex flex-col gap-3">
                                        {FILTER_OPTIONS.shifts.map((shift) => (
                                            <label key={shift} className="flex items-center space-x-3 cursor-pointer group">
                                                <Checkbox
                                                    checked={filters.shifts.includes(shift)}
                                                    onCheckedChange={() => toggleFilter("shifts", shift)}
                                                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                />
                                                <span className="text-sm text-gray-600 group-hover:text-black">{shift}</span>
                                            </label>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* PRICING */}
                            <AccordionItem value="item-pricing" className="border-b-0 mb-1">
                                <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-gray-700">Pricing</AccordionTrigger>
                                <AccordionContent className="pt-1 pb-3">
                                    <div className="flex flex-col gap-3">
                                        {FILTER_OPTIONS.pricing.map((price) => (
                                            <label key={price} className="flex items-center space-x-3 cursor-pointer group">
                                                <Checkbox
                                                    checked={filters.pricing.includes(price)}
                                                    onCheckedChange={() => toggleFilter("pricing", price)}
                                                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                />
                                                <span className="text-sm text-gray-600 group-hover:text-black">{price}</span>
                                            </label>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* SUBJECT */}
                            <AccordionItem value="item-subject" className="border-b-0 mb-1">
                                <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-gray-700">Subject</AccordionTrigger>
                                <AccordionContent className="pt-1 pb-3">
                                    <div className="flex flex-col gap-3">
                                        {FILTER_OPTIONS.subjects.map((subject) => (
                                            <label key={subject} className="flex items-center space-x-3 cursor-pointer group">
                                                <Checkbox
                                                    checked={filters.subjects.includes(subject)}
                                                    onCheckedChange={() => toggleFilter("subjects", subject)}
                                                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                />
                                                <span className="text-sm text-gray-600 group-hover:text-black">{subject}</span>
                                            </label>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </ScrollArea>
                </div>
            </section>

            {/* --- RIGHT MAIN AREA: Tabs & Exam List --- */}
            <section className="w-full border border-gray-200 rounded-lg bg-white px-6 py-6">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">

                    <TabsList className="mb-6 w-full justify-around bg-amber-100/50 p-1 text-amber-700">
                        <TabsTrigger className="data-[state=active]:bg-amber-500 data-[state=active]:text-white hover:bg-amber-200/50 transition-colors" value="all">All Papers</TabsTrigger>
                        <TabsTrigger className="data-[state=active]:bg-amber-500 data-[state=active]:text-white hover:bg-amber-200/50 transition-colors" value="pyq">PYQs</TabsTrigger>
                        <TabsTrigger className="data-[state=active]:bg-amber-500 data-[state=active]:text-white hover:bg-amber-200/50 transition-colors" value="mock">Mocks</TabsTrigger>
                        <TabsTrigger className="data-[state=active]:bg-amber-500 data-[state=active]:text-white hover:bg-amber-200/50 transition-colors" value="notes">Notes</TabsTrigger>
                    </TabsList>

                    {/* Exam List Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredPapers.length > 0 ? (
                            filteredPapers.map((paper) => (
                                <Card key={paper.id} className="hover:border-amber-400 transition-colors cursor-pointer shadow-sm group">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">
                                                {paper.type + " • " + paper.year}
                                            </span>
                                            <span className="text-xs text-gray-500 font-bold bg-gray-200 px-2 py-1 rounded-md">
                                                {paper.duration} mins
                                            </span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-br-lg ${paper.pricing === "Free" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                                                {paper.pricing}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg group-hover:text-amber-700 transition-colors">{paper.title}</CardTitle>
                                        <CardDescription className="flex flex-col gap-1 mt-1">
                                            <span>{examName} • Year: {paper.year}</span>
                                            <span className="text-xs text-gray-400">{paper.subject}</span>
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-xl">
                                <Search className="w-10 h-10 text-gray-300 mb-3" />
                                <h3 className="text-lg font-semibold text-gray-900">No papers found</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                                    We couldn't find anything matching your current filters. Try removing some filters or adjusting your search.
                                </p>
                                {activeCount > 0 && (
                                    <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                                        Clear all filters
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </Tabs>
            </section>

        </section>
    );
}