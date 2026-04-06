"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

interface SubjectPerformanceRadarProps {
    subjects: {
        subject: string;
        accuracy: number;
    }[];
}

export default function SubjectPerformanceRadar({ subjects }: SubjectPerformanceRadarProps) {
    return (
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col h-full">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
                <h3 className="font-black text-slate-900 tracking-tight text-sm">Subject-wise Performance</h3>
                <p className="text-xs text-slate-500 font-medium">Average accuracy across subjects</p>
            </CardHeader>
            <CardContent className="p-6 flex-1 min-h-[300px]">
                {subjects.length > 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjects}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 100]}
                                tick={{ fill: '#cbd5e1', fontSize: 10 }}
                                tickCount={5}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value}%`, 'Accuracy']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Radar
                                name="Accuracy"
                                dataKey="accuracy"
                                stroke="#3b82f6"
                                fill="#60a5fa"
                                fillOpacity={0.6}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm font-medium text-center px-4">
                        Attempt questions in at least 3 different subjects to unlock the radar chart.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}