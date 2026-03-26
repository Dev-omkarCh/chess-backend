import MatchManager from './MatchManager.js';
import GameManager from './GameManager.js';
import Friendship from '../models/Friendship.model.js';
import User from '../models/user.model.js';

class GameEngine {
    constructor(io) {
        this.io = io;
        this.matchManager = new MatchManager(this);
        this.gameManager = new GameManager(this);
    }

    handleConnection(socket, userId) {
        // 1. Tell MatchManager user is online
        socket.join(userId); // Join a private room for this userId to receive targeted events
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
            this.matchManager.handleUserDisconnect(userId);
        });
    }
}

export default GameEngine;