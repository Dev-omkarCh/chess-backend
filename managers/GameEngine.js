import MatchManager from './MatchManager.js';
import GameManager from './GameManager.js';
import Friendship from '../models/Friendship.model.js';

class GameEngine {
    constructor(io) {
        this.io = io;
        this.matchManager = new MatchManager(this);
        this.gameManager = new GameManager(this);
    }

    handleConnection(socket, userId) {
        // 1. Tell MatchManager user is online
        this.matchManager.handleUserConnect(userId, socket.id);

        // 2. Listen for Matchmaking
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

        socket.on('social:get-online-friends', async () => {
            const friendships = await Friendship.find({
                $or: [{ sender: userId }, { recipient: userId }],
                status: 'accepted'
            }).populate('sender recipient', 'username avatar elo');

            // 2. Filter for those currently in the Socket Map
            const onlineFriends = friendships.map(f => {
                const friend = f.sender._id.toString() === userId ? f.recipient : f.sender;
                return {
                    ...friend.toObject(),
                    isOnline: engine.matchManager.userSocketMap.has(friend._id.toString()),
                    // Bonus: Check if they are currently in a game
                    isPlaying: engine.gameManager.userToGame.has(friend._id.toString())
                };
            });

            socket.emit('social:online-friends-list', onlineFriends);
        });

        socket.on('disconnect', () => {
            this.matchManager.handleUserDisconnect(userId);
        });
    }
}

export default GameEngine;