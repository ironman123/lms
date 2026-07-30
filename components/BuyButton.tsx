// components/BuyButton.tsx
"use client";
import { useState } from "react";
import { createOrder, verifyPayment } from "@/app/(main)/actions/purchase-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface RazorpayPaymentResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    handler: (response: RazorpayPaymentResponse) => Promise<void>;
    theme: { color: string };
    modal: { ondismiss: () => void };
}

interface RazorpayCheckout {
    open: () => void;
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayCheckout;
    }
}

export default function BuyButton({
    bundleId, bundleName, priceRupees, className,
}: {
    bundleId: string;
    bundleName: string;
    priceRupees: number;
    className?: string;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleBuy = async () => {
        setLoading(true);
        try
        {
            const order = await createOrder(bundleId);

            if ("alreadyOwned" in order)
            {
                toast.info("You already have access to this pack.");
                return;
            }

            if (!window.Razorpay)
            {
                await new Promise<void>((res) => {
                    const s = document.createElement("script");
                    s.src = "https://checkout.razorpay.com/v1/checkout.js";
                    s.onload = () => res();
                    document.body.appendChild(s);
                });
            }

            if (!order.keyId) {
                throw new Error("Payment gateway is not configured.");
            }

            new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                order_id: order.orderId,
                name: "Converso",
                description: bundleName,
                handler: async (res: RazorpayPaymentResponse) => {
                    try
                    {
                        await verifyPayment(res.razorpay_order_id, res.razorpay_payment_id, res.razorpay_signature);
                        toast.success("Payment successful! Access unlocked.");
                        router.refresh();
                    } catch
                    {
                        toast.error("Payment verification failed. Contact support.");
                    }
                },
                theme: { color: "#0f172a" },
                modal: {
                    ondismiss: () => setLoading(false),
                },
            }).open();
        } catch (error: unknown)
        {
            toast.error(error instanceof Error ? error.message : "Something went wrong.");
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleBuy}
            disabled={loading}
            className={className ?? "w-full h-12 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"}
        >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : `Buy for ₹${priceRupees}`}
        </button>
    );
}
