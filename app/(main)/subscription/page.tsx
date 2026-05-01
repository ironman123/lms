// app/(main)/subscription/page.tsx
import prisma from "@/lib/prisma";
import { getOptionalUser } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import BuyButton from "@/components/BuyButton";
import Link from "next/link";
import { CheckCircle2, Lock, Zap, Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

async function getBundles() {
    return withCache("bundles:all", 3600, () =>
        prisma.productBundle.findMany({
            where: { isActive: true },
            include: {
                exam: { select: { id: true, name: true, slug: true, color: true } },
                _count: { select: { purchases: { where: { status: "PAID" } } } },
            },
            orderBy: { createdAt: "desc" },
        }), ["bundles"]
    );
}

const PERKS = [
    { icon: Zap, label: "Instant access after payment" },
    { icon: Shield, label: "Secure payment via Razorpay" },
    { icon: RefreshCw, label: "Lifetime access, no renewal" },
];

export default async function SubscriptionPage() {
    const [bundles, user] = await Promise.all([getBundles(), getOptionalUser()]);

    const ownedBundleIds = new Set(
        user
            ? (await prisma.userPurchase.findMany({
                where: {
                    userId: user.id,
                    status: "PAID",
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                select: { bundleId: true },
            })).map((p) => p.bundleId)
            : []
    );

    // Group by exam
    const byExam = bundles.reduce((acc, b) => {
        const key = b.exam.id;
        if (!acc[key]) acc[key] = { exam: b.exam, bundles: [] };
        acc[key].bundles.push(b);
        return acc;
    }, {} as Record<string, { exam: typeof bundles[0]["exam"]; bundles: typeof bundles }>);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="bg-slate-900 text-white py-20 px-4 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Converso Premium</p>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                    Unlock Full Mock Test Access
                </h1>
                <p className="text-slate-400 max-w-xl mx-auto text-lg">
                    One-time payment. Practice with complete previous year papers and exclusive mock tests.
                </p>
                <div className="flex items-center justify-center gap-8 mt-8">
                    {PERKS.map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-sm text-slate-300">
                            <Icon size={15} className="text-slate-400" />
                            {label}
                        </div>
                    ))}
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">

                {Object.values(byExam).length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 font-bold">No packs available yet. Check back soon.</p>
                    </div>
                ) : (
                    Object.values(byExam).map(({ exam, bundles: examBundles }) => (
                        <section key={exam.id}>
                            <div className="flex items-center gap-3 mb-6">
                                <div
                                    className="w-2 h-8 rounded-full"
                                    style={{ backgroundColor: exam.color ?? "#0f172a" }}
                                />
                                <h2 className="text-2xl font-black text-slate-900">{exam.name}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {examBundles.map((bundle) => {
                                    const owned = ownedBundleIds.has(bundle.id);
                                    return (
                                        <div
                                            key={bundle.id}
                                            className={cn(
                                                "bg-white rounded-3xl border p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden",
                                                owned ? "border-green-200" : "border-slate-200"
                                            )}
                                        >
                                            {owned && (
                                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl">
                                                    Owned
                                                </div>
                                            )}

                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 leading-tight pr-12">
                                                    {bundle.name}
                                                </h3>
                                                {bundle.description && (
                                                    <p className="text-sm text-slate-500 mt-1.5">{bundle.description}</p>
                                                )}
                                            </div>

                                            <ul className="space-y-1.5">
                                                <li className="flex items-center gap-2 text-xs text-slate-600">
                                                    <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                                    {bundle.bundleType === "FULL_ACCESS"
                                                        ? "All papers for this exam"
                                                        : `${bundle.paperIds.length} mock test${bundle.paperIds.length !== 1 ? "s" : ""}`}
                                                </li>
                                                <li className="flex items-center gap-2 text-xs text-slate-600">
                                                    <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                                    {bundle.validDays ? `Access for ${bundle.validDays} days` : "Lifetime access"}
                                                </li>
                                                <li className="flex items-center gap-2 text-xs text-slate-600">
                                                    <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                                    Detailed analytics & explanations
                                                </li>
                                            </ul>

                                            <div className="mt-auto">
                                                <p className="text-3xl font-black text-slate-900 mb-3">
                                                    ₹{bundle.price / 100}
                                                    <span className="text-sm font-normal text-slate-400 ml-1">
                                                        {bundle.validDays ? `/ ${bundle.validDays} days` : "one-time"}
                                                    </span>
                                                </p>

                                                {owned ? (
                                                    <Link
                                                        href={`/library/exam/${exam.slug}`}
                                                        className="w-full h-11 flex items-center justify-center bg-green-50 border border-green-200 text-green-700 font-bold text-sm rounded-xl hover:bg-green-100 transition-colors"
                                                    >
                                                        Start Practising →
                                                    </Link>
                                                ) : user ? (
                                                    <BuyButton
                                                        bundleId={bundle.id}
                                                        bundleName={bundle.name}
                                                        priceRupees={bundle.price / 100}
                                                    />
                                                ) : (
                                                    <Link
                                                        href="/login"
                                                        className="w-full h-11 flex items-center justify-center gap-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-700 transition-colors"
                                                    >
                                                        <Lock size={14} /> Sign in to buy
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))
                )}

                {/* FAQ */}
                <section className="bg-white rounded-3xl border border-slate-200 p-8">
                    <h2 className="text-xl font-black text-slate-900 mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {[
                            { q: "Is this a subscription?", a: "No. It's a one-time payment with lifetime access. No auto-renewals." },
                            { q: "Which payment methods are accepted?", a: "UPI, credit/debit cards, net banking, and wallets via Razorpay." },
                            { q: "Can I get a refund?", a: "Contact support within 7 days of purchase if you face any issues." },
                            { q: "Will new mocks be added?", a: "Yes. Full Access packs include all future papers added to that exam." },
                        ].map(({ q, a }) => (
                            <div key={q} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <p className="text-sm font-bold text-slate-900 mb-1">{q}</p>
                                <p className="text-sm text-slate-500">{a}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}