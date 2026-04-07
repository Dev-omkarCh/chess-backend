import MatchManager from './MatchManager.js';
import GameManager from './GameManager.js';
import Friendship from '../models/Friendship.model.js';

class GameEngine {
    constructor(io) {
        this.io = io;
        this.userSocketMap = new Map();
        this.matchManager = new MatchManager(this);
        this.gameManager = new GameManager(this);
    }

    async handleConnection(socket, userId) {

        socket.join(userId);

        // Add user to the map
        this.userSocketMap.set(userId, socket.id);

        // Notify friends that this user is online
        await this.notifyFriendsOnlineStatus(userId, true);

        // Listen for Matchmaking
        socket.on('match:queue-join', (prefs) => {
            console.log(`[GameEngine] User ${userId} attempted to join the queue with preferences:`, prefs);
            this.matchManager.handleJoinQueue(userId);
        });

        socket.on('game:join', ({ gameId }) => {
            console.log(`[GameEngine] User ${userId} joined game: ${gameId}`);
            this.gameManager.handleJoinGame(socket, userId, gameId);
        });

        socket.on('match:queue-leave', () => {
            console.log(`[GameEngine] User ${userId} left the queue`);
            this.matchManager.handleRemoveFromQueue(userId);
        });

        // 3. Listen for Game Moves
        socket.on('game:move', (moveData) => {
            this.gameManager.handleMove(userId, moveData);
        });

        socket.on('social:get-online-friends', ({ friendIds }) => {
            // No Database Query Needed! 
            // Just check your in-memory Map for these specific IDs
            const onlineStatuses = friendIds.map(id => {
                const isOnline = this.matchManager.userSocketMap.has(id);
                if (isOnline) {
                    return {
                        _id: id,
                        isOnline: true,
                        isPlaying: this.gameManager.userToGame.has(id)
                    };
                }
                return null;
            }).filter(Boolean);

            socket.emit('social:online-friends-list', onlineStatuses);
        });

        socket.on('disconnect', () => {
            socket.leave(userId);
            delete this.userSocketMap[userId];
            this.notifyFriendsOnlineStatus(userId, false);
            this.matchManager.handleUserDisconnect(userId);
        });
    }

    /**
     * Notifies friends of a user about their online status
     * @param {string} userId - The ID of the user
     * @param {boolean} isOnline - The online status of the user
     */
    async notifyFriendsOnlineStatus(userId, isOnline) {
        try {
            // Fetch friends (Consider caching this list if user reconnects often)
            const friendships = await Friendship.find({
                $or: [{ sender: userId }, { recipient: userId }],
                status: 'accepted'
            }).select('sender recipient');

            const friendIds = friendships.map(f =>
                f.sender.toString() === userId ? f.recipient.toString() : f.sender.toString()
            );

            if (!friendIds.length) return;

            // Pre-calculate the status ONCE, not inside the loop
            // This prevents the "Race Condition" where isPlaying changes mid-loop
            const statusUpdate = [{
                _id: userId,
                isOnline: isOnline,
                isPlaying: this.gameManager.userToGame.has(userId)
            }];

            // Use for...of for cleaner async flow control
            for (const friendId of friendIds) {
                const friendSocketId = this.userSocketMap.get(friendId);

                if (friendSocketId) {
                    // Emit to the friend's socket
                    this.io.to(friendSocketId).emit('social:online-friends-list', statusUpdate);
                }
            }

            console.log(`[Social] Notified friends of ${userId} about their online status`);
        } catch (error) {
            console.error(`[Social Error] Failed to notify friends for ${userId}:`, error);
        }
    }
}

export default GameEngine;