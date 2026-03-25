import mongoose from "mongoose";

export const FriendshipSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'blocked'],
        default: 'pending',
    },

}, { timestamps: true });
const Friendship = mongoose.model("Friendship", FriendshipSchema);

// Optimization: Ensure a user cannot send multiple requests to the same person
FriendshipSchema.index({ sender: 1, recipient: 1 }, { unique: true });

export default Friendship;