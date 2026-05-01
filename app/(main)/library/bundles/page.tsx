// app/(main)/library/bundles/page.tsx
import prisma from "@/lib/prisma";
import { getOptionalUser } from "@/lib/auth";
import { withCache } from "@/lib/cache";
import BuyButton from "@/components/BuyButton";
import Link from "next/link";
import { Plus, Package, CheckCircle2, Lock } from "lucide-react";
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

export default async function BundlesPage() {
    const [bundles, user] = await Promise.all([
        getBundles(),
        getOptionalUser(),
    ]);

    // Get user's active purchases
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

    const isAdmin = user?.role === "ADMIN";

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-5xl mx-auto px-4 py-12">
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Mock Test <span className="text-slate-400 font-light">Packs</span>
                        </h1>
                        <p className="text-slate-500 mt-1">One-time purchase. Lifetime access.</p>
                    </div>
                    {isAdmin && (
                        <Link
                            href="/library/bundles/new"
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
                        >
                            <Plus size={15} /> New Bundle
                        </Link>
                    )}
                </div>

                {bundles.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                        <Package size={36} className="mx-auto text-slate-200 mb-3" />
                        <p className="font-bold text-slate-400">No bundles available yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bundles.map((bundle) => {
                            const owned = ownedBundleIds.has(bundle.id);
                            return (
                                <div
                                    key={bundle.id}
                                    className={cn(
                                        "bg-white rounded-3xl border p-6 flex flex-col gap-4 shadow-sm",
                                        owned ? "border-green-200" : "border-slate-200"
                                    )}
                                >
                                    {/* Exam tag */}
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg text-white"
                                            style={{ backgroundColor: bundle.exam.color ?? "#0f172a" }}
                                        >
                                            {bundle.exam.name}
                                        </span>
                                        {owned && (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-widest">
                                                <CheckCircle2 size={12} /> Owned
                                            </span>
                                        )}
                                    </div>

                                    {/* Name + desc */}
                                    <div className="flex-1">
                                        <h2 className="text-lg font-black text-slate-900 leading-tight">{bundle.name}</h2>
                                        {bundle.description && (
                                            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{bundle.description}</p>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                        <span>{bundle.bundleType === "FULL_ACCESS" ? "Full Access" : `${bundle.paperIds.length} Mocks`}</span>
                                        <span>{bundle.validDays ? `${bundle.validDays} days` : "Lifetime"}</span>
                                        <span>{bundle._count.purchases} students</span>
                                    </div>

                                    {/* CTA */}
                                    {owned ? (
                                        <Link
                                            href={`/library/exam/${bundle.exam.slug}`}
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

                                    <p className="text-center text-xl font-black text-slate-900">
                                        ₹{bundle.price / 100}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}