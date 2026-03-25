import express from "express";
import {
    sendFriendRequest,
    getFriends,
    blockUser,
    unblockUser,
    getBlockedUsers,
    getPendingRequests,
    updateRequest,
    removeFriend,
    clearFriendships
} from "../controllers/friend.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

// FRIEND REQUESTS
router.post('/request', verifyJWT, sendFriendRequest);
router.get('/requests/pending', verifyJWT, getPendingRequests);
router.patch('/requests/:requestId', verifyJWT, updateRequest);

// FRIENDS (The established relationship)
router.get('/', verifyJWT, getFriends);
router.delete('/:friendId', verifyJWT, removeFriend);

// BLOCKING (Safety & Privacy)
router.get('/blocked', verifyJWT, getBlockedUsers);
router
    .post('/block/:userId', verifyJWT, blockUser)
    .delete('/block/:userId', verifyJWT, unblockUser);

// danger : only dev
router.get("/clear", clearFriendships);

export default router;