import chalk from "chalk";
import Friendship from "../models/Friendship.model.js";

class MatchManager {
    constructor(engine) {
        this.engine = engine;
        this.queue = [];
        this.userSocketMap = new Map(); // userId -> socketId
    }

    handleUserConnect(userId, socketId) {
        this.userSocketMap.set(userId, socketId);
        this.notifyFriendsOnlineStatus(userId, true);
        // console.log(`[Socket] User Added to Socket Map: ${chalk.green(userId)}`);
        // this.broadcastStats();
    }

    async notifyFriendsOnlineStatus(userId, isOnline) {
        // Get all friends of this user
        const friendships = await Friendship.find({
            $or: [{ sender: userId }, { recipient: userId }],
            status: 'accepted'
        }).select('sender recipient');

        // 2. Extract the Friend IDs
        const friendIds = friendships.map(f =>
            f.sender.toString() === userId ? f.recipient.toString() : f.sender.toString()
        );

        if (!friendIds || friendIds.length === 0) {
            console.log("[NOTIFY] No Friends to Notify");
            return;
        }

        // 3. For every friend, check if they are currently connected
        friendIds.forEach(friendId => {
            const friendSocketId = this.userSocketMap?.get(friendId);

            if (friendSocketId) {
                console.log(`[NOTIFY] User ${userId} friend SocketId ${friendSocketId}`)
                // 4. Emit ONLY to that specific friend's socket
                // Sending as an array to keep it compatible with your existing Redux action
                this.engine.io.to(friendSocketId).emit('social:online-friends-list', [{
                    _id: userId,
                    isOnline: isOnline,
                    isPlaying: this.engine.gameManager.userToGame.has(userId)
                }]);
            }
        });
    }

    async handleUserDisconnect(userId) {
        await this.notifyFriendsOnlineStatus(userId, false);
        this.userSocketMap.delete(userId);
        // console.log(`[Socket] User Removed from Socket Map: ${chalk.red(userId)}`);
        this.handleRemoveFromQueue(userId);
        console.log(`[Socket Disconnected] User Id: ${chalk.red(userId)}`);
    }

    handleJoinQueue(userId) {
        if (!this.queue.includes(userId)) {
            this.queue.push(userId);
            console.log(`[MatchManager] User Joined Queue: ${chalk.green(userId)} | Queue Length: ${chalk.yellow(this.queue.length)}`);
            this.broadcastStats();
            console.log(`[MatchManager] Attempting to match users...`);
            this.tryMatch();
        }
    }

    handleRemoveFromQueue(userId) {
        if (this.queue.includes(userId)) {
            this.queue = this.queue.filter(id => id !== userId);
            console.log(`[MatchManager] User Removed from Queue: ${chalk.red(userId)} | Queue Length: ${chalk.yellow(this.queue.length)}`);
            this.broadcastStats();
        }
    }

    tryMatch() {
        if (this.queue.length < 2) {
            console.log(`[MatchManager] Not enough players to match. Queue Length: ${chalk.yellow(this.queue.length)}`);
            return;
        }
        while (this.queue.length >= 2) {
            const p1 = this.queue.shift();
            const p2 = this.queue.shift();

            // Tell the Engine to create the game
            this.engine.gameManager.createGame(p1, p2);
        }
        console.log(`[MatchManager] Matchmaking complete. Remaining in queue: ${chalk.yellow(this.queue.length)}`);
        this.broadcastStats();
    }

    broadcastStats() {
        this.engine.io.emit('match:update-stats', {
            onlineCount: this.userSocketMap.size,
            inQueueCount: this.queue.length
        });
    }
}

export default MatchManager;