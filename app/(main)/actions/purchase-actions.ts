"use server";

import prisma from "@/lib/prisma";
import { razorpay, verifyRazorpaySignature } from "@/lib/razorpay";
import { requireAuth } from "@/lib/auth";

export async function createOrder(bundleId: string) {
    const user = await requireAuth();

    const bundle = await prisma.productBundle.findUnique({
        where: { id: bundleId, isActive: true },
    });
    if (!bundle) throw new Error("Bundle not found");

    // Check not already purchased
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

    // Create PENDING purchase row
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

export async function verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
) {
    const user = await requireAuth();

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

// Call this before createExamSession to check access
export async function checkPaperAccess(
    userId: string,
    paperId: string
): Promise<boolean> {
    // Check if paper belongs to any bundle the user has paid for
    const access = await prisma.userPurchase.findFirst({
        where: {
            userId,
            status: "PAID",
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            bundle: {
                OR: [
                    { paperIds: { has: paperId } },
                    { bundleType: "FULL_ACCESS" },
                ],
            },
        },
    });

    return !!access;
}