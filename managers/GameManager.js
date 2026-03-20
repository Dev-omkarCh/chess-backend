import { Game } from '../classes/Game.js';

class GameManager {
    constructor(engine) {
        this.engine = engine;
        this.games = new Map(); // gameId -> Game Instance
        this.userToGame = new Map(); // userId -> gameId
    }

    createGame(p1, p2) {
        const gameId = `game_${Date.now()}`;
        const newGame = new Game(gameId, p1, p2, this.engine.io);

        this.games.set(gameId, newGame);
        this.userToGame.set(p1, gameId);
        this.userToGame.set(p2, gameId);

        // Tell users to join the socket room for this specific game
        const s1 = this.engine.matchManager.userSocketMap.get(p1);
        const s2 = this.engine.matchManager.userSocketMap.get(p2);

        // Put them in a private room
        this.engine.io.sockets.sockets.get(s1)?.join(gameId);
        this.engine.io.sockets.sockets.get(s2)?.join(gameId);

        // Emit match found
        this.engine.io.to(gameId).emit('match:found', {
            gameId,
            white: p1,
            black: p2
        });
    }

    handleMove(userId, moveData) {
        const gameId = this.userToGame.get(userId);
        const game = this.games.get(gameId);

        if (game) {
            game.makeMove(userId, moveData);
        }
    }

    handleJoinGame(socket, userId, gameId) {
        const game = this.games.get(gameId);
        console.log(`[Game Join Attempt] User ID: ${userId} is attempting to join Game ID: ${gameId}`);
        if (!game) {
            console.log(`[Game Join Failed] User ID: ${userId} attempted to join non-existent Game ID: ${gameId}`);
            socket.emit('game:error', { message: "Game not found" });
            return;
        }
        // Join the socket room (crucial for refreshes)
        socket.join(gameId);
        console.log(`[Game Join] User ID: ${userId} joined Game ID: ${gameId}`);

        // Send the player their specific game data
        socket.emit('game:init', {
            fen: game.board.fen(),
            white: game.white,
            black: game.black,
            color: game.white === userId ? 'w' : 'b', // Determine color on the fly
            history: game.board.history()
        });
    }
}

export default GameManager;