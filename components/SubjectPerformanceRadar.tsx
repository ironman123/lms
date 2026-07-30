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
        <Card className="border-border shadow-sm rounded-2xl bg-card overflow-hidden flex flex-col h-full">
            <CardHeader className="border-b border-border bg-background/50 pb-4">
                <h3 className="font-black text-foreground tracking-tight text-sm">Subject-wise Performance</h3>
                <p className="text-xs text-muted-foreground font-medium">Average accuracy across subjects</p>
            </CardHeader>
            <CardContent className="p-6 flex-1 min-h-[300px]">
                {subjects.length > 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjects}>
                            <PolarGrid stroke="var(--border)" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 700 }}
                            />
                            <PolarRadiusAxis
                                angle={30}
                                domain={[0, 100]}
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                tickCount={5}
                            />
                            <Tooltip
                                formatter={(value: number) => [`${value}%`, 'Accuracy']}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--popover)',
                                    color: 'var(--popover-foreground)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                                }}
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
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm font-medium text-center px-4">
                        Attempt questions in at least 3 different subjects to unlock the radar chart.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
