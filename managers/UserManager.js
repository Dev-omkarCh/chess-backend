class UserManager {
    constructor(engine) {
        this.engine = engine;
        this.users = new Map(); // Key: userId, Value: { elo: Number, gameId: String }
    }

    async addUser(userId, elo) {
        this.users.set(userId, { elo });
        console.log(`[UserManager] User ${userId} added with ELO ${elo}`);
    }

    setGameId(userId, gameId) {
        const user = this.users.get(userId);
        if (user) {
            user.gameId = gameId;
            this.users.set(userId, user);
        }
    }

    getGameId(userId) {
        const user = this.users.get(userId);
        if (user) return user.gameId;
        return null;
    }

    getUser(userId) {
        return this.users.get(userId);
    }

    removeUser(userId) {
        const deletedUser = this.users.delete(userId);
        if (!deletedUser) {
            console.log(`[UserManager] User ${userId} not found`);
            return
        }
        console.log(`[UserManager] User ${userId} removed`);
    }

    getUserElo(userId) {
        const user = this.users.get(userId);
        if (user) return user.elo;
        return null;
    }
}

export default UserManager;
