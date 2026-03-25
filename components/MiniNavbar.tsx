import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabOption {
    id: string;
    label: string;
    count?: number;
}

interface MiniNavbarProps {
    tabs: TabOption[];
    activeTab: string;
}

const MiniNavbar = ({ tabs }: MiniNavbarProps) => {
    return (
        /* 1. Wrapper Div: 
           Added 'overflow-x-auto' for swiping and 'hide-scrollbar' (custom utility).
           'flex-nowrap' is critical to prevent tabs from wrapping to the next line.
        */
        <div className="w-full overflow-x-auto hide-scrollbar -mx-1 px-1">
            <TabsList className="flex w-max min-w-full justify-around h-auto p-1 bg-slate-100 rounded-2xl border border-slate-200/70 gap-1">
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        /* 2. whitespace-nowrap: 
                           Ensures labels like "All Papers" stay on one line.
                           'shrink-0' ensures the flexbox doesn't squash the tab.
                        */
                        className="group flex shrink-0 items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-500 whitespace-nowrap transition-all hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md"
                    >
                        {tab.label}

                        {tab.count !== undefined && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold tracking-wider bg-slate-200/80 text-slate-500 transition-colors group-data-[state=active]:bg-slate-800 group-data-[state=active]:text-slate-300">
                                {tab.count}
                            </span>
                        )}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
};

export default MiniNavbar;