import Denque from "denque";

class MatchManager {

    FAIRNESS_RANGE = 150;
    constructor(engine) {
        this.engine = engine;
        this.buckets = new Map(); // Key: "timeControl_type", Value: [userId, userId...]
        this.userBucketMap = new Map(); // Key: "userId", Value: "bucketKey
    }

    async handleUserDisconnect(userId) {
        this.handleRemoveFromQueue(userId);
    }

    handleJoinQueue(userId, prefs) {
        // console.log(`[MatchManager] User ${userId} attempted to join the queue with preferences:`, prefs);

        if (!prefs.timeControl || !prefs.type) {
            console.log(`[MatchManager] Invalid preferences for user ${userId}`);
            return;
        }
        const bucketKey = `${prefs.timeControl}_${prefs.type}`;

        // Initialize bucket if it doesn't exist
        if (!this.buckets.has(bucketKey)) {
            this.buckets.set(bucketKey, new Denque());
        }

        this.userBucketMap.set(userId, bucketKey);

        const currentBucket = this.buckets.get(bucketKey);

        // Prevent duplicate entries
        if (currentBucket.get(userId)) return;

        // Add user to the specific bucket
        currentBucket.push(userId);
        console.log(`[MatchManager] User ${userId} joining bucket: ${bucketKey}`);

        // console.log(`[MatchManager] User ${userId} added to bucket ${bucketKey}. Bucket Size: ${currentBucket.length}`);

        this.broadcastStats();

        // Match check is now instant for this specific bucket
        this.tryMatch(bucketKey, prefs);
    }

    // tryMatch(bucketKey, prefs) {
    //     const queue = this.buckets.get(bucketKey);

    //     if (!queue || queue.length < 2) {
    //         // console.log(`[MatchManager] Can't find match. Queue ${bucketKey} has less than 2 users.`);
    //         return;
    //     }

    //     // Get the player who has been waiting the longest (the head)
    //     const p1 = queue.peekFront();
    //     const p1Elo = this.engine.userManager.getUserElo(p1);

    //     // Define the FAIR range for p1
    //     const minElo = p1Elo - this.FAIRNESS_RANGE;
    //     const maxElo = p1Elo + this.FAIRNESS_RANGE;

    //     // Look for a partner for p1 within the queue
    //     let p2Index = -1;
    //     for (let i = 1; i < queue.length; i++) {
    //         const potentialPartner = queue.get(i);
    //         const p2Elo = this.engine.userManager.getUserElo(potentialPartner);

    //         if (p2Elo >= minElo && p2Elo <= maxElo) {

    //             // Safety check: Are they still online?
    //             if (!this.engine.userSocketMap.has(p1) && !this.engine.userSocketMap.has(potentialPartner)) {
    //                 console.log(`[MatchManager] User ${p1} or ${potentialPartner} is not online`);
    //                 console.log(`[MatchManager] Disconnecting ${p1} and ${potentialPartner}`);
    //                 this.handleUserDisconnect(p1);
    //                 this.handleUserDisconnect(potentialPartner);
    //                 continue;
    //             }

    //             // Safety check: Are they still online?
    //             if (!this.engine.userSocketMap.has(p1)) {
    //                 if (this.engine.userSocketMap.has(potentialPartner)) queue.unshift(potentialPartner);
    //                 continue;
    //             }
    //             if (!this.engine.userSocketMap.has(potentialPartner)) {
    //                 if (this.engine.userSocketMap.has(p1)) queue.unshift(p1);
    //                 continue;
    //             }

    //             p2Index = i;

    //             console.log(`[MatchFound] ${p1} vs ${potentialPartner} for ${bucketKey}`);
    //             this.engine.gameManager.createGame(p1, potentialPartner, prefs);
    //             break;
    //         }
    //     }

    //     // if (p2Index !== -1) {
    //     //     // MATCH FOUND!
    //     //     const player1 = queue.shift(); // Remove head
    //     //     const player2 = queue.remove(p2Index, 1)[0]; // Remove partner from middle

    //     //     this.userLocation.delete(player1);
    //     //     this.userLocation.delete(player2);

    //     //     this.engine.gameManager.createGame(player1, player2, bucketKey);
    //     // }

    //     // We only need to check the specific bucket that just changed
    //     // while (queue && queue.length >= 2) {
    //     //     const p1 = queue.shift();
    //     //     const p2 = queue.shift();

    //     //     // Safety check: Are they still online?
    //     //     if (!this.engine.userSocketMap.has(p1)) {
    //     //         if (this.engine.userSocketMap.has(p2)) queue.unshift(p2);
    //     //         continue;
    //     //     }
    //     //     if (!this.engine.userSocketMap.has(p2)) {
    //     //         if (this.engine.userSocketMap.has(p1)) queue.unshift(p1);
    //     //         continue;
    //     //     }

    //     //     console.log(`[MatchFound] ${p1} vs ${p2} for ${bucketKey}`);

    //     //     // Pass the prefs to the GameManager so the Game class knows the clock/rules
    //     //     this.engine.gameManager.createGame(p1, p2, prefs);
    //     // }

    // }

    tryMatch(bucketKey, prefs) {
        const queue = this.buckets.get(bucketKey);
        if (!queue || queue.length < 2) return;

        // 1. Identify the 'Anchor' (Longest waiter)
        const p1 = queue.peekFront();

        // Safety check for p1 immediately
        if (!this.engine.userSocketMap.has(p1)) {
            console.log(`[MatchManager] Anchor user ${p1} offline, removing...`);
            queue.shift();
            this.userBucketMap.delete(p1);
            return this.tryMatch(bucketKey, prefs); // Recurse to check next in line
        }

        const p1Elo = this.engine.userManager.getUserElo(p1);
        const minElo = p1Elo - this.FAIRNESS_RANGE;
        const maxElo = p1Elo + this.FAIRNESS_RANGE;

        // 2. Scan for a valid partner
        let p2Index = -1;
        for (let i = 1; i < queue.length; i++) {
            const p2 = queue.get(i);

            // Safety check for p2
            if (!this.engine.userSocketMap.has(p2)) {
                queue.remove(i, 1);
                this.userBucketMap.delete(p2);
                i--; // Adjust index because queue shrank
                continue;
            }

            const p2Elo = this.engine.userManager.getUserElo(p2);

            // 3. Elo Fairness Check
            if (p2Elo >= minElo && p2Elo <= maxElo) {
                p2Index = i;
                break;
            }
        }

        // 4. Execution
        if (p2Index !== -1) {
            const player2 = queue.remove(p2Index, 1)[0];
            const player1 = queue.shift(); // Remove p1 from front

            // Cleanup tracking
            this.userBucketMap.delete(player1);
            this.userBucketMap.delete(player2);

            console.log(`[MatchFound] ${player1} (${p1Elo}) vs ${player2} for ${bucketKey}`);
            this.engine.gameManager.createGame(player1, player2, prefs);

            // Optional: If queue is still large, try to match the next pair
            if (queue.length >= 2) this.tryMatch(bucketKey, prefs);
        }
    }

    handleRemoveFromQueue(userId) {
        // We get the bucketKey from the userBucketMap
        const bucketKey = this.userBucketMap.get(userId);
        if (!bucketKey) {
            console.log(`[MatchManager] User ${userId} not found in queue`);
            return;
        }
        const queue = this.buckets.get(bucketKey);
        if (!queue) {
            this.userBucketMap.delete(userId);
            console.log(`[MatchManager] Bucket ${bucketKey} not found for user ${userId}`);
            return;
        }

        const index = queue.toArray().indexOf(userId);
        if (index !== -1) {
            queue.remove(index);
            console.log(`[MatchManager] User ${userId} removed from bucket ${bucketKey}`);
        }
        this.userBucketMap.delete(userId);
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