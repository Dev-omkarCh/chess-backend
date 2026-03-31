import mongoose, { Schema, Document } from 'mongoose';

const ChallengeSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['ranked', 'casual'],
        default: 'casual'
    },
    timeControl: {
        type: String,
        enum: ['1m', '3m', '5m', '10m'],
        required: true
    },
    side: {
        type: String,
        enum: ['white', 'black', 'random'],
        default: 'random'
    },
    isChatEnabled: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
        default: 'pending'
    },
    // Industry Standard: Use TTL (Time To Live) index to auto-delete or expire
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
        index: { expires: 0 } // MongoDB will auto-remove the doc when this date is reached
    }
}, { timestamps: true });

export const Challenge = mongoose.model('Challenge', ChallengeSchema);