// app/(main)/actions/purchase-actions.ts
"use server";

import prisma from "@/lib/prisma";
//import { razorpay, verifyRazorpaySignature } from "@/lib/razorpay";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { invalidateTag } from "@/lib/cache";
import { revalidatePath } from "next/cache";

// ── Admin: create a bundle ────────────────────────────────────────────────────
export async function createBundle(data: {
    name: string;
    description?: string;
    examId: string;
    bundleType: "MOCK_PACK" | "FULL_ACCESS";
    paperIds: string[];   // empty = all papers (FULL_ACCESS)
    priceRupees: number;  // we accept rupees, store paise
    validDays?: number;   // undefined = lifetime
}) {
    await requireAdmin();

    if (!data.name?.trim()) return { success: false, error: "Bundle name is required." };
    if (!data.examId) return { success: false, error: "Exam is required." };
    if (data.priceRupees <= 0) return { success: false, error: "Price must be greater than 0." };

    const bundle = await prisma.productBundle.create({
        data: {
            name: data.name.trim(),
            description: data.description?.trim() || null,
            examId: data.examId,
            bundleType: data.bundleType,
            paperIds: data.bundleType === "FULL_ACCESS" ? [] : data.paperIds,
            price: Math.round(data.priceRupees * 100), // rupees → paise
            validDays: data.validDays ?? null,
            isActive: true,
        },
    });

    await invalidateTag("bundles");
    revalidatePath("/library/bundles");
    revalidatePath("/subscription");
    return { success: true, id: bundle.id };
}

// ── Admin: toggle bundle active/inactive ─────────────────────────────────────
export async function toggleBundle(bundleId: string, isActive: boolean) {
    await requireAdmin();
    await prisma.productBundle.update({
        where: { id: bundleId },
        data: { isActive },
    });
    await invalidateTag("bundles");
    revalidatePath("/library/bundles");
    revalidatePath("/subscription");
    return { success: true };
}

// ── Student: create Razorpay order ────────────────────────────────────────────
export async function createOrder(bundleId: string) {
    const user = await requireAuth();
    const { getRazorpay, verifyRazorpaySignature } = await import("@/lib/razorpay");
    const razorpay = getRazorpay();

    const bundle = await prisma.productBundle.findUnique({
        where: { id: bundleId, isActive: true },
    });
    if (!bundle) throw new Error("Bundle not found");

    const existing = await prisma.userPurchase.findFirst({
        where: {
            userId: user.id,
            bundleId,
            status: "PAID",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
    });
    if (existing) return { alreadyOwned: true };

    const order = await razorpay.orders.create({
        amount: bundle.price,
        currency: bundle.currency,
        receipt: `receipt_${user.id.slice(-8)}_${Date.now()}`,
        notes: { userId: user.id, bundleId },
    });

    await prisma.userPurchase.create({
        data: {
            userId: user.id,
            bundleId,
            razorpayOrderId: order.id,
            status: "PENDING",
            amountPaid: bundle.price,
            expiresAt: bundle.validDays
                ? new Date(Date.now() + bundle.validDays * 86400000)
                : null,
        },
    });

    return {
        orderId: order.id,
        amount: bundle.price,
        currency: bundle.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
    };
}

// ── Student: verify payment after Razorpay callback ──────────────────────────
export async function verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
) {
    const user = await requireAuth();
    const { verifyRazorpaySignature } = await import("@/lib/razorpay");

    if (!verifyRazorpaySignature(orderId, paymentId, signature))
    {
        throw new Error("Invalid payment signature");
    }

    const purchase = await prisma.userPurchase.findUnique({
        where: { razorpayOrderId: orderId },
        include: { bundle: true },
    });

    if (!purchase || purchase.userId !== user.id)
    {
        throw new Error("Purchase not found");
    }

    await prisma.userPurchase.update({
        where: { razorpayOrderId: orderId },
        data: {
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
            status: "PAID",
        },
    });

    return { success: true };
}

// ── Read: get all bundles for subscription page ───────────────────────────────
export async function getBundlesForSubscriptionPage() {
    return prisma.productBundle.findMany({
        where: { isActive: true },
        include: {
            exam: { select: { id: true, name: true, slug: true, color: true } },
            _count: { select: { purchases: { where: { status: "PAID" } } } },
        },
        orderBy: { createdAt: "desc" },
    });
}

// ── Read: get bundles with purchase status for a user ─────────────────────────
export async function getUserBundles(userId: string) {
    return prisma.userPurchase.findMany({
        where: {
            userId,
            status: "PAID",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { bundleId: true, expiresAt: true },
    });
}
