import { Challenge } from "../models/Challenge.model.js";
import Friendship from "../models/Friendship.model.js";
import Notifications from "../models/Notification.model.js";
import User from "../models/user.model.js";
import { getGameEngine, getIO } from "../socket.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * POST /api/v1/friends/requests
 * @description Send a friend request
 * @body {recipientId}
 */
export const sendFriendRequest = asyncHandler(async (req, res) => {
    const { recipientId } = req.body;
    const senderId = req.user._id;

    if (senderId.equals(recipientId)) {
        throw new ApiError(400, "You cannot send a friend request to yourself");
    }

    const existingRequest = await Friendship.findOne({
        $or: [
            { sender: senderId, recipient: recipientId },
            { sender: recipientId, recipient: senderId }
        ]
    });

    console.log("[Send Friend Request] Existing Request ID: ", existingRequest?._id);

    if (existingRequest) {
        throw new ApiError(400, "Friend request already sent or accepted");
    }

    const friendship = await Friendship.create({
        sender: senderId,
        recipient: recipientId,
        status: 'pending'
    });

    const notification = await Notifications.create({
        recipient: recipientId,
        sender: senderId,
        category: 'social',
        event: 'request',
        message: `New friend request from ${req.user?.username}`,
        relatedId: friendship._id,
        onModel: 'Friendship',
    });

    const io = getIO();

    // Emit specifically to the recipient's private room (userId)
    io.to(recipientId.toString()).emit('notification:new', notification);

    console.log(`[Friend Request] User ${req.user?._id} sent friend request to recipient ${recipientId}`);

    return res
        .status(201)
        .json(new ApiResponse(201, {}, "Friend request sent successfully"));
});

/**
 * PATCH /api/v1/friends/requests/:requestId
 * @description Update friend request status (accept/reject)
 * @body {status: "accepted" | "rejected"}
 * @params {requestId}
 */
export const updateRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    console.log(`[Friend Request] User ${req.user?._id} has ${status === "accepted" ? "accepted" : "rejected"} friend request ${requestId}`);

    const friendship = await Friendship.findById(requestId);

    if (!friendship) {
        throw new ApiError(404, "Friend request not found");
    }

    // Check if the request is for this user
    if (friendship.recipient.toString() !== userId) {
        throw new ApiError(403, "Unauthorized to update this request");
    }

    if (friendship.status !== 'pending') {
        throw new ApiError(400, "Request is not pending");
    }

    const sender = await User.findById(userId);
    const recipient = await User.findById(friendship.sender);

    const gameEngine = getGameEngine();
    const io = getIO();
    const userSocketMap = gameEngine?.matchManager?.userSocketMap;

    if (status === 'accepted') {
        io.to(friendship.sender.toString()).emit('notification:new', {
            _id: friendship._id,
            type: 'FRIEND_REQUEST_ACCEPTED',
            message: `${req.user?.username} accepted your friend request`,
            sender: req.user,
            payload: {
                friend: {
                    ...sender.toObject(),
                    isOnline: userSocketMap ? userSocketMap.has(sender._id.toString()) : false,
                    lastOnline: sender.lastLogin ? sender.lastLogin : null
                }
            },
            timestamp: friendship.updatedAt
        });
    }

    if (status === 'rejected') {
        io.to(friendship.sender.toString()).emit('notification:new', {
            _id: friendship._id,
            type: 'FRIEND_REQUEST_REJECTED',
            message: `${req.user?.username} rejected your friend request`,
            sender: req.user,
            payload: {},
            timestamp: friendship.updatedAt
        });
    }

    friendship.status = status;
    await friendship.save();

    await friendship.populate('sender', 'username email');
    await friendship.populate('recipient', 'username email');

    const friend = {
        ...recipient.toObject(),
        isOnline: userSocketMap ? userSocketMap.has(recipient._id.toString()) : false,
        lastOnline: recipient.lastLogin ? recipient.lastLogin : null
    };

    return res
        .status(200)
        .json(new ApiResponse(200, friend, "Friend request updated successfully"));
});

/**
 * GET /api/v1/friends/requests/pending
 * @description Get all pending friend requests
 */
export const getPendingRequests = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const requests = await Friendship.find({
        recipient: userId,
        status: 'pending'
    })
        .populate('sender', 'username elo avatar')
        .sort({ createdAt: -1 });

    if (!requests) {
        throw new ApiError(404, "No friend requests found");
    }

    const notification = requests.map(req => ({
        _id: req._id,
        sender: req.sender,
        isRead: req.status !== 'pending',
        message: `New friend request from ${req.sender.username}`,
        type: 'FRIEND_REQUEST',
        timestamp: req.createdAt,
        payload: {}
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, notification, "Friend requests fetched successfully"));
});

/**
 * GET /api/v1/friends
 * @description Get all friends
 */
export const getFriends = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Fetch friendships where the user is either sender or recipient
    const friendships = await Friendship.find({
        $or: [
            { sender: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' }
        ]
    })
        // Ensure we populate all fields required for the final response
        .populate('sender', 'username email avatar elo fullName isVerified lastLogin')
        .populate('recipient', 'username email avatar elo fullName isVerified lastLogin');

    const gameEngine = getGameEngine();
    const userSocketMap = gameEngine?.matchManager?.userSocketMap; // Access the userSocketMap to determine online status

    if (!userSocketMap) {
        // throw new ApiError(500, "Failed to access user socket map");
        console.log("Warning: userSocketMap not available, defaulting all friends to offline");
    }

    // Extract the "other" person from the friendship object
    const formattedFriends = friendships.map(f => {
        // Determine which side of the relationship is the friend
        const friendData = f.sender._id.toString() === userId.toString()
            ? f.recipient
            : f.sender;

        // 4. Return the exact structure requested
        return {
            _id: friendData._id,
            username: friendData.username,
            email: friendData.email,
            avatar: friendData.avatar,
            elo: friendData.elo || 0, // Fallback if elo isn't set
            fullName: friendData.fullName || friendData.username,
            isOnline: userSocketMap ? userSocketMap.has(friendData._id.toString()) : false,
            isVerified: friendData.isVerified,
            lastOnline: friendData.lastLogin ? friendData.lastLogin.toISOString() : null
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedFriends, "Friends fetched successfully"));
});

/**
 * DELETE /api/v1/friends/:friendId
 * @description Remove a friend
 * @params {friendId}
 */
export const removeFriend = asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.id;

    const friendship = await Friendship.findOneAndDelete({
        $or: [
            { sender: userId, recipient: friendId },
            { sender: friendId, recipient: userId }
        ]
    });

    if (!friendship) {
        throw new ApiError(404, "Friendship not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, friendship, "Friend removed successfully"));
});

/**
 * GET /api/v1/friends/block
 * @description Get all blocked users
 */
export const getBlockedUsers = asyncHandler(async (req, res) => {
    const blockerId = req.user.id;

    const blockedUsers = await BlockedUser.find({ blocker: blockerId })
        .populate('blocked', 'username email')
        .select('blocked');

    return res
        .status(200)
        .json(new ApiResponse(200, blockedUsers, "Blocked users fetched successfully"));
});

/**
 * POST /api/v1/friends/block/:userId
 * @description Block a user
 * @params {userId}
 */
export const blockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const blockerId = req.user.id;

    // Find or create a blocked entry
    let blocked = await BlockedUser.findOne({
        blocker: blockerId,
        blocked: userId
    });

    if (!blocked) {
        blocked = new BlockedUser({
            blocker: blockerId,
            blocked: userId
        });
        await blocked.save();
    }

    // Also ensure any pending requests are rejected
    await Friendship.updateMany(
        { $or: [{ sender: userId, recipient: blockerId }, { sender: blockerId, recipient: userId }] },
        { $set: { status: 'rejected' } }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, blocked, "User blocked successfully"));
});

/**
 * DELETE /api/v1/friends/block/:userId
 * @description Unblock a user
 * @params {userId}
 */
export const unblockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const blockerId = req.user.id;

    const blocked = await BlockedUser.findOneAndDelete({
        blocker: blockerId,
        blocked: userId
    });

    if (!blocked) {
        throw new ApiError(404, "User not blocked");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, blocked, "User unblocked successfully"));
});

export const challengeFriend = asyncHandler(async (req, res) => {
    const { challenge } = req.body;
    const { friendId } = req.params;
    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "Unauthorized");
    }

    if (!friendId) {
        throw new ApiError(400, "Can't Challenge without FriendId");
    }

    if (!challenge || !challenge.friend || !challenge.type || !challenge.timeControl || !challenge.side || !challenge.chatEnabled) {
        throw new ApiError(400, "Challenge Object is not Valid");
    }

    const newChallenge = await Challenge.create({
        sender: userId,
        type: challenge.type,
        recipient: challenge.friend._id,
        timeControl: challenge.timeControl,
        side: challenge.side,
        isChatEnabled: challenge.isChatEnabled
    });

    // Notification

    console.log("New Challenge: ", newChallenge);
    return res.status(201).json(
        new ApiResponse(201, newChallenge, "Challenge Created!")
    );
});

// Dev only
export const clearFriendships = asyncHandler(async (req, res) => {
    await Friendship.deleteMany({});

    res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Clear All FriendShips")
        );
});