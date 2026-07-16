import crypto from "crypto"
import razorpay from '../config/razorpay.js';
import Transaction from '../models/payment.model.js';

// 1. CREATE SECURE ORDER
export const createOrder = async (req, res) => {
    try {
        console.log("Order Recieved")
        const { amount, name, message } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // Convert INR amount to subunits (Paise)
        const amountInPaise = Math.round(amount * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${Date.now()}`
        };

        // Create Razorpay Order
        const order = await razorpay.orders.create(options);

        // Save initial transaction state to Database
        const newTransaction = await Transaction.create({
            orderId: order.id,
            amount: amount,
            name: name || 'Anonymous',
            message: message || '',
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });

    } catch (error) {
        console.error("Order Creation Error: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. CRYPTOGRAPHIC SIGNATURE VERIFICATION
export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify properties exist
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing verification fields" });
        }

        // Reconstruct payload signature base
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        // Compute expected HMAC SHA256 digest
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        // Cryptographically compare signatures
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Find local transaction and mark completed
            const transaction = await Transaction.findOneAndUpdate(
                { orderId: razorpay_order_id },
                {
                    status: 'completed',
                    paymentId: razorpay_payment_id
                },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Payment verified and recorded successfully!",
                transaction
            });
        } else {
            // Mark transaction status as failed in database
            await Transaction.findOneAndUpdate(
                { orderId: razorpay_order_id },
                { status: 'failed' }
            );

            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

    } catch (error) {
        console.error("Verification Route Error: ", error);
        res.status(500).json({ success: false, error: error.message });
    }
};