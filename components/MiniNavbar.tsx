import React from 'react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TabOption {
    id: string;
    label: string;
    count?: number;
}

interface MiniNavbarProps {
    tabs: TabOption[];
    // We don't need 'onValueChange' here because 
    // the <Tabs> root handles the state update!
}

const MiniNavbar = ({ tabs }: MiniNavbarProps) => {
    return (
        <TabsList className="mb-6 w-full justify-around bg-amber-100/50 p-1 text-amber-700">
            {tabs.map((tab) => (
                <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-amber-500 data-[state=active]:text-white hover:bg-amber-200/50 transition-colors"
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className="ml-2 text-xs opacity-60">({tab.count})</span>
                    )}
                </TabsTrigger>
            ))}
        </TabsList>
    )
}

export default MiniNavbar