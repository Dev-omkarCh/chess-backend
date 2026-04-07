import chalk from "chalk";
import Friendship from "../models/Friendship.model.js";

class MatchManager {
    constructor(engine) {
        this.engine = engine;
        this.queue = [];
        this.userSocketMap = new Map(); // userId -> socketId
    }

    async handleUserDisconnect(userId) {
        this.handleRemoveFromQueue(userId);
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