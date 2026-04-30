import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(body)
        .digest("hex");

    if (expected !== signature)
    {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.failed")
    {
        const orderId = event.payload.payment.entity.order_id;
        await prisma.userPurchase.updateMany({
            where: { razorpayOrderId: orderId },
            data: { status: "PENDING" }, // stays pending, user can retry
        });
    }

    if (event.event === "refund.created")
    {
        const paymentId = event.payload.refund.entity.payment_id;
        await prisma.userPurchase.updateMany({
            where: { razorpayPaymentId: paymentId },
            data: { status: "REFUNDED" },
        });
    }

    return NextResponse.json({ ok: true });
}