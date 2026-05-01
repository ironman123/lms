import Razorpay from "razorpay";
import crypto from "crypto";

if (!process.env.RAZORPAY_KEY_ID) throw new Error("RAZORPAY_KEY_ID missing");
if (!process.env.RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET missing");

// export const razorpay = new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

export function getRazorpay() {
    if (!process.env.RAZORPAY_KEY_ID) throw new Error("RAZORPAY_KEY_ID missing");
    if (!process.env.RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET missing");
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

export function verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");
    return expected === signature;
}