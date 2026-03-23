import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabOption {
    id: string;
    label: string;
    count?: number;
}

interface MiniNavbarProps {
    tabs: TabOption[];
}

const MiniNavbar = ({ tabs }: MiniNavbarProps) => {
    return (
        /* 1. Parent Container: 
          Uses slate-100 background with heavy rounded-2xl corners.
          'justify-start' ensures it scrolls nicely on mobile instead of crushing together.
        */
        <TabsList className="flex w-full justify-around h-auto p-1.5 bg-slate-100 rounded-2xl border border-slate-200/70">
            {tabs.map((tab) => (
                <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    /* 2. Tab Triggers: 
                      group class added so we can style the child badge.
                      Active state: Turns solid slate-900 with white text.
                      Inactive state: text-slate-500, bold, hovers to a slightly darker slate background.
                    */
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 transition-all hover:text-slate-900 hover:bg-slate-200/50 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md"
                >
                    {tab.label}

                    {/* 3. Count Badge:
                      Matches the text-[10px] uppercase style of your ExamCard tags.
                      group-data-[state=active]:... makes it automatically switch to a dark badge when the parent tab is clicked!
                    */}
                    {tab.count !== undefined && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-slate-200/80 text-slate-500 transition-colors group-data-[state=active]:bg-slate-800 group-data-[state=active]:text-slate-200">
                            {tab.count}
                        </span>
                    )}
                </TabsTrigger>
            ))}
        </TabsList>
    );
};

export default MiniNavbar;