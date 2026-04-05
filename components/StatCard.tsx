import { LucideIcon } from "lucide-react";

const COLORS = {
    blue: { bg: "bg-blue-600", icon: "text-white", badge: "bg-blue-500 text-white" },
    green: { bg: "bg-green-600", icon: "text-white", badge: "bg-green-500 text-white" },
    purple: { bg: "bg-purple-600", icon: "text-white", badge: "bg-purple-500 text-white" },
    orange: { bg: "bg-orange-500", icon: "text-white", badge: "bg-orange-400 text-white" },
} as const;

export default function StatCard({
    icon: Icon, label, value, badge, color
}: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    badge: string;
    color: keyof typeof COLORS;
}) {
    const c = COLORS[color];
    return (
        <div className={`${c.bg} rounded-2xl p-5 flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
                <Icon size={20} className={c.icon} />
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${c.badge}`}>
                    {badge}
                </span>
            </div>
            <div>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-white/70 mt-0.5 font-medium">{label}</p>
            </div>
        </div>
    );
}