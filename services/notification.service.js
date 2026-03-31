import { Notification } from '../models/Notification.js';
import { getIO } from '../socket.js';

/**
 * NOTIFICATION FACTORY
 * 
 * Handles DB persistence and Real-time emission in one place.
 */


export const createNotification = async ({
    recipient,
    sender = null,
    category,
    event,
    relatedId = null,
    onModel = null,
    message,
    payload = {},
    ctaLink = ''
}) => {
    try {
        // 1. Persist to MongoDB
        const notification = await Notification.create({
            recipient,
            sender,
            category,
            event,
            relatedId,
            onModel,
            message,
            payload,
            ctaLink
        });

        // 2. Fetch current sender details (Avatar/Username) for the live Toast
        // This ensures the recipient sees the LATEST sender info immediately.
        const populatedNotif = await Notification.findById(notification._id)
            .populate('sender', 'username avatar elo')
            .lean();

        // 3. Emit via Socket.io to the recipient's private room
        const io = getIO();
        io.to(recipient.toString()).emit('notification:new', populatedNotif);

        return notification;
    } catch (error) {
        console.error("Notification Factory Error:", error);
        // We usually don't throw error here so it doesn't break the main request
        return null;
    }
};
