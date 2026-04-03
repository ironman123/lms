"use client";
import { useEffect, useState } from "react";

export default function SessionTimer({ durationSeconds }: { durationSeconds: number }) {
    const [remaining, setRemaining] = useState(durationSeconds);

    useEffect(() => {
        const interval = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 0) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const h = Math.floor(remaining / 3600).toString().padStart(2, "0");
    const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, "0");
    const s = (remaining % 60).toString().padStart(2, "0");

    const isWarning = remaining < 300; // last 5 minutes

    return (
        <div className={`px-4 py-1.5 rounded-full font-mono font-bold text-sm shadow-lg transition-colors ${isWarning ? "bg-red-500 text-white shadow-red-200" : "bg-slate-900 text-white shadow-slate-200"
            }`}>
            {h}:{m}:{s}
        </div>
    );
}