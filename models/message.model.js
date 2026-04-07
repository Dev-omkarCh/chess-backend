import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500 // Prevent "Chat Spam" attacks
    },
    type: {
        type: String,
        enum: ['user', 'system'], // 'system' is for "White has resigned" or "Draw offered"
        default: 'user'
    }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;