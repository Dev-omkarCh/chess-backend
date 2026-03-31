import mongoose from "mongoose";
const { Schema } = mongoose;

/*
|-------------------------------------------------------------------------------------------------------------------|
| Event         | Purpose                       | Why it's necessary                                                |
|---------------|-------------------------------|-------------------------------------------------------------------|
| request       | Friend/Challenge initiation   | Triggers "Accept/Decline" buttons in the UI.                      |
| accept        | The "Handshake" success       | Triggers a "Success" toast and potentially a redirect to a game.  |
| decline       | The "Handshake" failure       | Informs the sender so they aren't left waiting forever.           |
| invite        | Tournament/Club invites       | Distinct from a 1v1 challenge (often has different expiry logic). |
| result        | Post-game summary             | Tells the user "You won/lost" while they were offline.            |
| announcement  | System-wide updates           | Used for maintenance or new feature "blast" messages.             |
| message       | Social/Chat alerts            | Inbox notifications for unread direct messages.                   |
| achievement   | Level up / Badges             | Triggers special "Confetti" or "Gold" UI styling.                 |
|-------------------------------------------------------------------------------------------------------------------|

*/
const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false // System messages might not have a sender
    },

    // Paired Approach
    category: {
        type: String,
        enum: ['social', 'game', 'system'],
        required: true
    },
    event: {
        type: String,
        enum: ['request', 'accept', 'decline', 'invite', 'result', 'announcement', 'message', 'achievement'],
        required: true
    },

    // Dynamic References or Polymorphic Populating
    relatedId: {
        type: Schema.Types.ObjectId,
        required: false,
        refPath: 'onModel'
    },
    onModel: {
        type: String,
        required: false,
        enum: ['Challenge', 'Friendship', 'User']
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    ctaLink: {
        type: String,
    },
    payload: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});



notificationSchema.index({ category: 1, event: 1, recipient: 1, isRead: 1 }); // For Admin Analytics

/**
 * Prevents invalid pairs like { category: 'system', event: 'decline' }
 */
notificationSchema.pre('validate', function (next) {
    const validPairs = {
        social: ['request', 'accept', 'decline'],
        game: ['request', 'accept', 'decline'],
        system: ['announcement', 'message']
    };

    const allowedEvents = validPairs[this.category];

    if (!allowedEvents || !allowedEvents.includes(this.event)) {
        return next(new Error(`Invalid event "${this.event}" for category "${this.category}"`));
    }

    next();
});

const Notifications = mongoose.model('Notification', notificationSchema);
export default Notifications;