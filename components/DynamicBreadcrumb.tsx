'use client';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import React from "react";

import { usePathname, useSearchParams } from 'next/navigation';


// It just takes the name as a prop!
const DynamicBreadcrumb = () => {

    const pathname = usePathname();

    const history = pathname.split('/').filter(Boolean); // Split the path and filter out empty segments

    return (
        <div className="m-4 ml-9">
            <Breadcrumb className="mb-6">
                <BreadcrumbList>

                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>

                    {history.map((segment, index) => {
                        // Rebuild the URL up to the current segment
                        // e.g., if we are on "exam", it builds "/library/exam"
                        const href = `/${history.slice(0, index + 1).join('/')}`;

                        // Check if this is the very last item in the array
                        const isLast = index === history.length - 1;

                        // Format the text: Decode URL characters (%20) and capitalize the first letter
                        const decodedStr = decodeURIComponent(segment);
                        const displayText = decodedStr.charAt(0).toUpperCase() + decodedStr.slice(1);

                        return (
                            <React.Fragment key={href}>
                                {/* Every mapped item gets a separator before it */}
                                <BreadcrumbSeparator />

                                <BreadcrumbItem className={"text-gray-700 hover:text-black transition"}>
                                    {isLast ? (
                                        // If it's the last item, it's the current page (not a link)
                                        <BreadcrumbPage className="text-primary font-bold">{displayText}</BreadcrumbPage>
                                    ) : (
                                        // If it's a middle item, make it a clickable link
                                        <BreadcrumbLink href={href}>{displayText}</BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
}

export default DynamicBreadcrumb;