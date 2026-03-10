import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2 } from "lucide-react";

// 1. Define the shape of a single syllabus category
export interface SyllabusCategory {
    category: string;
    topics: string[];
}

// 2. Define the props for your component
interface SyllabusDropdownProps {
    data: SyllabusCategory[];
}

// 3. Pass the props into the component
const SyllabusDropdown = ({ data }: SyllabusDropdownProps) => {

    // Optional: If there's no data yet, don't render the empty accordion
    if (!data || data.length === 0)
    {
        return null;
    }

    return (
        <div className="w-full border border-gray-200 rounded-lg bg-white px-6 py-2 mt-4">
            <Accordion type="single" collapsible>
                <AccordionItem value="syllabus" className="border-none">

                    <AccordionTrigger className="text-xl font-bold hover:no-underline py-4">
                        View Full Syllabus
                    </AccordionTrigger>

                    <AccordionContent className="pb-8 pt-2">
                        <div className="flex flex-col gap-8">

                            {/* 4. Map over the dynamic 'data' prop instead of hardcoded data */}
                            {data.map((section, index) => (
                                <div key={index} className="flex flex-col gap-4">

                                    <h3 className="text-[#3b82f6] text-lg font-semibold">
                                        {section.category}
                                    </h3>

                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                        {section.topics.map((topic, tIndex) => (
                                            <li key={tIndex} className="flex items-start gap-3 text-gray-700 text-base">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5 stroke-[2.5]" />
                                                <span className="leading-snug">{topic}</span>
                                            </li>
                                        ))}
                                    </ul>

                                </div>
                            ))}

                        </div>
                    </AccordionContent>

                </AccordionItem>
            </Accordion>
        </div>
    );
}

export default SyllabusDropdown;