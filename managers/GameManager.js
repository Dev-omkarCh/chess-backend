import { Chess } from "chess.js";

class Game {
    constructor(roomId, player1, player2) {
        this.roomId = roomId;
        this.players = {
            white: player1, // Store socket ID or User ID
            black: player2
        };
        this.chess = new Chess();
        this.startTime = new Date();
        this.moveHistory = [];
    }

    makeMove(move) {
        // move is an object: { from: 'e2', to: 'e4', promotion: 'q' }
        const result = this.chess.move(move);
        if (result) {
            this.moveHistory.push(result);
            return result; // Returns move details if legal
        }
        return null; // Returns null if illegal
    }

    getGameState() {
        return {
            fen: this.chess.fen(),
            isCheckmate: this.chess.isCheckmate(),
            isDraw: this.chess.isDraw(),
            turn: this.chess.turn(),
            pgn: this.chess.pgn() // Great for your AI later!
        };
    }
}

class GameManager {
    constructor() {
        this.games = new Map(); // roomId -> Game Instance
    }

    createGame(roomId, p1, p2) {
        const newGame = new Game(roomId, p1, p2);
        this.games.set(roomId, newGame);
        return newGame;
    }

    getGame(roomId) {
        return this.games.get(roomId);
    }

    removeGame(roomId) {
        this.games.delete(roomId);
    }

    // Advanced: Clean up inactive games to save memory
    cleanup() {
        // Logic to delete games that haven't had a move in 24 hours
    }
}

// Export a single instance (Singleton Pattern)
export const gameManager = new GameManager();