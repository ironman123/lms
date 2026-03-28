"use client";

import React, { useState, useRef } from "react";
import { GripHorizontal, Activity, Clock, MousePointer2, AlertTriangle, X, Fingerprint, Database, CheckCircle2, HelpCircle } from "lucide-react";

// Updated to perfectly match your Prisma QuestionInteraction model
interface DevMetricsProps {
    sessionMode: string;
    sessionId: string;
    userId: string;
    metrics: {
        questionId: string;
        visitCount: number;
        dwellTimeSeconds: number;
        hesitationCount: number;
        isFlagged: boolean;
        selectedAnswer: string | null;
        isCorrect: boolean | null;
        wasHinted: boolean;
        confidenceLevel: number | null;
    };
    recentActivities: Array<{ event: string; time: string }>;
}

export default function DevMetricsOverlay({ sessionMode, sessionId, userId, metrics, recentActivities }: DevMetricsProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number } | null>(null);

    // Handle Dragging Logic
    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX - position.x,
            startY: e.clientY - position.y,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !dragRef.current) return;
        setPosition({
            x: e.clientX - dragRef.current.startX,
            y: e.clientY - dragRef.current.startY,
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        dragRef.current = null;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    if (!isVisible) return null;

    // Helper to truncate long UUIDs for the dev UI
    const truncate = (id: string) => id ? `${id.slice(0, 4)}...${id.slice(-4)}` : "N/A";

    return (
        <div
            className="fixed z-[9999] w-80 bg-slate-900 text-slate-300 rounded-xl shadow-2xl border border-slate-700 overflow-hidden font-mono text-xs flex flex-col"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                opacity: isDragging ? 0.9 : 1,
                userSelect: isDragging ? "none" : "auto",
            }}
        >
            {/* Draggable Header */}
            <div
                className="bg-slate-950 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-slate-700"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="flex items-center gap-2 text-slate-400">
                    <GripHorizontal size={14} />
                    <span className="font-bold tracking-wider text-green-400">DEV_METRICS</span>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="hover:text-white transition-colors p-1"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4">

                {/* Database Context */}
                <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1 text-slate-500"><Database size={10} /> Mode</span>
                        <span className="text-blue-400 font-bold">{sessionMode}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1 text-slate-500"><Fingerprint size={10} /> User</span>
                        <span className="text-slate-400">{truncate(userId)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1 text-slate-500"><Activity size={10} /> Session</span>
                        <span className="text-slate-400">{truncate(sessionId)}</span>
                    </div>
                </div>

                {/* QuestionInteraction Metrics */}
                <div className="space-y-2">
                    <div className="text-slate-500 font-bold border-b border-slate-700 pb-1 mb-2 flex justify-between">
                        <span>Current Interaction</span>
                        <span className="text-slate-600">QID: {truncate(metrics.questionId)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1 text-slate-500"><Clock size={10} /> Dwell</span>
                            <span className="text-yellow-400">{metrics.dwellTimeSeconds}s</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1 text-slate-500"><MousePointer2 size={10} /> Visits</span>
                            <span className="text-white">{metrics.visitCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1 text-slate-500"><AlertTriangle size={10} /> Hesitate</span>
                            <span className={metrics.hesitationCount > 0 ? "text-red-400" : "text-slate-400"}>
                                {metrics.hesitationCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Flagged</span>
                            <span className={metrics.isFlagged ? "text-orange-400" : "text-slate-600"}>
                                {metrics.isFlagged ? "True" : "False"}
                            </span>
                        </div>
                    </div>

                    {/* Answer State */}
                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1 text-slate-500"><CheckCircle2 size={10} /> Answer</span>
                            <span className={metrics.selectedAnswer ? "text-emerald-400" : "text-slate-600"}>
                                {metrics.selectedAnswer ? truncate(metrics.selectedAnswer) : "NULL"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Is Correct</span>
                            <span className={metrics.isCorrect === true ? "text-emerald-400" : metrics.isCorrect === false ? "text-red-400" : "text-slate-600"}>
                                {metrics.isCorrect === null ? "NULL" : String(metrics.isCorrect)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1 text-slate-500"><HelpCircle size={10} /> Hinted</span>
                            <span className={metrics.wasHinted ? "text-cyan-400" : "text-slate-600"}>
                                {metrics.wasHinted ? "True" : "False"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ActivityLog Tail */}
                <div className="space-y-2 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-1 text-slate-500 font-bold mb-2">
                        <Activity size={12} /> Recent ActivityLog
                    </div>
                    <ul className="space-y-1">
                        {recentActivities.length > 0 ? recentActivities.map((act, idx) => (
                            <li key={idx} className="flex justify-between opacity-80">
                                <span className="text-purple-400 truncate pr-2">{act.event}</span>
                                <span className="text-slate-500 text-[9px] shrink-0">{act.time}</span>
                            </li>
                        )) : (
                            <li className="text-slate-600 italic text-center py-1">No recent activity</li>
                        )}
                    </ul>
                </div>

            </div>
        </div>
    );
}