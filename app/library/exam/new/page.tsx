'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs'; // Ensure correct path
import NewExamForm from '@/components/NewExamForm';
import MiniNavbar from '@/components/MiniNavbar'; // Your dynamic tab switcher

const tabs = [
    { id: "exam", label: "Add Exam", count: 0 },
    { id: "pyqs", label: "Add PYQs", count: 12 },
    { id: "mock", label: "Add Mocks", count: 4 },
    { id: "notes", label: "Add Notes", count: 3 },
];

const New = () => {
    // We start with "exam" as the default so the form is visible immediately
    const [activeTab, setActiveTab] = useState("exam");

    return (
        <div className="w-full px-2 py-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            <article className='flex items-center justify-between'>
                <h1 className="text-2xl font-bold text-slate-900">Content Management</h1>
            </article>

            <section className="w-full border  border-gray-200 rounded-lg bg-white p-6 shadow-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                    {/* Your dynamic switcher component */}
                    <MiniNavbar tabs={tabs} />

                    {/* Content for "Add Exam" */}
                    <TabsContent value="exam" className="block mt-6 w-full">
                        <NewExamForm />
                    </TabsContent>

                    {/* Content for "Add PYQs" */}
                    <TabsContent value="pyqs" className="mt-6">
                        <div className="p-8 border-2 border-dashed rounded-lg text-center text-slate-500">
                            PYQ Upload Form Component goes here
                        </div>
                    </TabsContent>

                    {/* Content for "Add Mocks" */}
                    <TabsContent value="mock" className="mt-6">
                        <div className="p-8 border-2 border-dashed rounded-lg text-center text-slate-500">
                            Mock Test Creator Component goes here
                        </div>
                    </TabsContent>

                    {/* Content for "Add Notes" */}
                    <TabsContent value="notes" className="mt-6">
                        <div className="p-8 border-2 border-dashed rounded-lg text-center text-slate-500">
                            Notes & Study Material Component goes here
                        </div>
                    </TabsContent>

                </Tabs>
            </section>
        </div>
    );
};

export default New;