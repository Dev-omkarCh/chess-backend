import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: null },
    amount: { type: Number, required: true }, // Amount in actual currency (e.g. 300)
    currency: { type: String, default: 'INR' },
    name: { type: String, default: 'Anonymous' },
    message: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;