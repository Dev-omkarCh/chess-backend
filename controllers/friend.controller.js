import Friendship from "../models/Friendship.model.js";
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
    const senderId = req.user.id;

    if (senderId === recipientId) {
        throw new ApiError(400, "You cannot send a friend request to yourself");
    }

    const existingRequest = await Friendship.findOne({
        $or: [
            { sender: senderId, recipient: recipientId },
            { sender: recipientId, recipient: senderId }
        ]
    });

    if (existingRequest) {
        throw new ApiError(400, "Friend request already sent or accepted");
    }

    const friendship = new Friendship({
        sender: senderId,
        recipient: recipientId,
        status: 'pending'
    });

    await friendship.save();

    // Populate to return user details
    await friendship.populate('sender', 'username email');
    await friendship.populate('recipient', 'username email');

    return res
        .status(201)
        .json(new ApiResponse(201, friendship, "Friend request sent successfully"));
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

    friendship.status = status;
    await friendship.save();

    await friendship.populate('sender', 'username email');
    await friendship.populate('recipient', 'username email');

    return res
        .status(200)
        .json(new ApiResponse(200, friendship, "Friend request updated successfully"));
});

/**
 * GET /api/v1/friends/requests/pending
 * @description Get all pending friend requests
 */
export const getPendingRequests = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const requests = await Friendship.find({
        recipient: userId,
        status: 'pending'
    })
        .populate('sender', 'username email')
        .sort({ createdAt: -1 });

    if (!requests) {
        throw new ApiError(404, "No friend requests found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, requests, "Friend requests fetched successfully"));
});

/**
 * GET /api/v1/friends
 * @description Get all friends
 */
export const getFriends = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const friendships = await Friendship.find({
        $or: [
            { sender: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' }
        ]
    })
        .populate('sender', 'username email')
        .populate('recipient', 'username email');

    // Format the response to easily get friend details
    const friends = friendships.map(f => {
        const friend = f.sender._id.toString() === userId ? f.recipient : f.sender;
        return {
            ...friend,
            friendshipId: f._id,
            status: f.status
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, friends, "Friends fetched successfully"));
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