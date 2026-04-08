
class MatchManager {
    constructor(engine) {
        this.engine = engine;
        this.buckets = new Map(); // Key: "timeControl_type", Value: [userId, userId...]
    }

    async handleUserDisconnect(userId) {
        this.handleRemoveFromQueue(userId);
    }

    handleJoinQueue(userId, prefs) {
        console.log(`[MatchManager] User ${userId} attempted to join the queue with preferences:`, prefs);

        if (!prefs.timeControl || !prefs.type) {
            console.log(`[MatchManager] Invalid preferences for user ${userId}`);
            return;
        }
        const bucketKey = `${prefs.timeControl}_${prefs.type}`;
        console.log(`[MatchManager] User ${userId} joining bucket: ${bucketKey}`);

        // Initialize bucket if it doesn't exist
        if (!this.buckets.has(bucketKey)) {
            this.buckets.set(bucketKey, []);
        }

        const currentBucket = this.buckets.get(bucketKey);

        // Prevent duplicate entries
        if (currentBucket.includes(userId)) return;

        // Add user to the specific bucket
        currentBucket.push(userId);

        console.log(`[MatchManager] User ${userId} added to bucket ${bucketKey}. Bucket Size: ${currentBucket.length}`);

        this.broadcastStats();

        // Match check is now instant for this specific bucket
        this.tryMatch(bucketKey, prefs);
    }

    tryMatch(bucketKey, prefs) {
        const queue = this.buckets.get(bucketKey);

        // We only need to check the specific bucket that just changed
        while (queue && queue.length >= 2) {
            const p1 = queue.shift();
            const p2 = queue.shift();

            // Safety check: Are they still online?
            if (!this.engine.userSocketMap.has(p1)) {
                if (this.engine.userSocketMap.has(p2)) queue.unshift(p2);
                continue;
            }
            if (!this.engine.userSocketMap.has(p2)) {
                if (this.engine.userSocketMap.has(p1)) queue.unshift(p1);
                continue;
            }

            console.log(`[MatchFound] ${p1} vs ${p2} for ${bucketKey}`);

            // Pass the prefs to the GameManager so the Game class knows the clock/rules
            this.engine.gameManager.createGame(p1, p2, prefs);
        }
    }

    handleRemoveFromQueue(userId) {
        // We have to look through all buckets to find the user
        this.buckets.forEach((queue, key) => {
            const index = queue.indexOf(userId);
            if (index !== -1) {
                queue.splice(index, 1);
                console.log(`[MatchManager] User ${userId} removed from bucket ${key}`);
            }
        });
        this.broadcastStats();
    }

    broadcastStats() {
        let totalInQueue = 0;
        this.buckets.forEach(queue => totalInQueue += queue.length);

        this.engine.io.emit('match:update-stats', {
            usersInQueue: totalInQueue,
            onlineUsers: this.engine.userSocketMap.size
        });
    }

}

export default MatchManager;