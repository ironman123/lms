// "use client";
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// export default function ScoreTrendChart({ data }: { data: { date: string; score: number; accuracy: number }[] }) {
//     return (
//         <div className="bg-white border border-slate-200 rounded-2xl p-6">
//             <h3 className="font-black text-slate-900 mb-1">Performance Trend</h3>
//             <p className="text-xs text-slate-400 mb-6">Your score progression over time</p>
//             <ResponsiveContainer width="100%" height={240}>
//                 <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                     <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
//                     <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
//                     <Tooltip contentStyle={{ borderRadius: 12, border: "0.5px solid #e2e8f0", fontSize: 12 }} />
//                     <Legend wrapperStyle={{ fontSize: 12 }} />
//                     <Line type="monotone" dataKey="score" stroke="#0f172a" strokeWidth={2} dot={{ r: 4, fill: "#0f172a" }} name="Score %" />
//                     <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e" }} name="Accuracy %" />
//                 </LineChart>
//             </ResponsiveContainer>
//         </div>
//     );
// }


"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
    score: { label: "Score %", color: "hsl(var(--chart-1))" },
    accuracy: { label: "Accuracy %", color: "hsl(var(--chart-2))" },
};

export default function ScoreTrendChart({ data }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-black text-slate-900 mb-1">Performance Trend</h3>
            <p className="text-xs text-slate-400 mb-6">Your score progression over time</p>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
            </ChartContainer>
        </div>
    );
}