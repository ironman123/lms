"use client";
import { useState } from "react";
import { createOrder, verifyPayment } from "@/app/(main)/actions/purchase-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

declare global {
    interface Window { Razorpay: any; }
}

export default function BuyButton({
    bundleId, bundleName, price
}: { bundleId: string; bundleName: string; price: number }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleBuy = async () => {
        setLoading(true);
        try
        {
            const order = await createOrder(bundleId);
            if ("alreadyOwned" in order)
            {
                toast.info("You already own this pack");
                return;
            }

            // Load Razorpay script dynamically
            if (!window.Razorpay)
            {
                await new Promise<void>((res) => {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.onload = () => res();
                    document.body.appendChild(script);
                });
            }

            const rzp = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                order_id: order.orderId,
                name: "ExamPrep",
                description: bundleName,
                handler: async (response: any) => {
                    try
                    {
                        await verifyPayment(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature
                        );
                        toast.success("Payment successful! Access unlocked.");
                        router.refresh();
                    } catch
                    {
                        toast.error("Payment verification failed. Contact support.");
                    }
                },
                theme: { color: "#0f172a" },
            });
            rzp.open();
        } catch (err: any)
        {
            toast.error(err.message);
        } finally
        {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleBuy}
            disabled={loading}
            className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
            {loading ? "Loading..." : `Buy for ₹${price / 100}`}
        </button>
    );
}