import { Game } from '../classes/Game.js';
import gameModel from '../models/game.model.js';

class GameManager {
    constructor(engine) {
        this.engine = engine;
        this.games = new Map(); // gameId -> Game Instance
        this.userToGame = new Map(); // userId -> gameId
    }

    async createGame(p1, p2, prefs) {

        try {
            // Randomize colors fairly (50/50 chance)
            const isP1White = Math.random() < 0.5;
            const whitePlayer = isP1White ? p1 : p2;
            const blackPlayer = isP1White ? p2 : p1;

            // CREATE DATABASE RECORD IMMEDIATELY (Status: ongoing)
            const dbGame = await gameModel.create({
                whitePlayer: whitePlayer,
                blackPlayer: blackPlayer,
                status: 'ongoing',
                timeControl: prefs.timeControl,
                type: prefs.type || 'rated',
                pgn: '',
                moves: [],
            });

            const gameId = dbGame?._id.toString();

            const newGame = new Game(gameId, whitePlayer, blackPlayer, this.engine.io, prefs, dbGame);



            this.games.set(gameId, newGame);
            this.userToGame.set(p1, gameId);
            this.userToGame.set(p2, gameId);

            const s1 = this.engine.userSocketMap.get(p1);
            const s2 = this.engine.userSocketMap.get(p2);

            this.engine.io.sockets.sockets.get(s1)?.join(gameId);
            this.engine.io.sockets.sockets.get(s2)?.join(gameId);

            // Emit match found with specific color per player or unified payload
            this.engine.io.to(p1).emit('match:found', {
                gameId,
                color: whitePlayer === p1 ? 'w' : 'b',
                opponent: whitePlayer === p1 ? p2 : p1,
                prefs
            });

            this.engine.io.to(p2).emit('match:found', {
                gameId,
                color: whitePlayer === p2 ? 'w' : 'b',
                opponent: whitePlayer === p2 ? p2 : p1,
                prefs
            });

            console.log(`[Game Created & Saved to DB] ID: ${gameId} | White: ${whitePlayer} vs Black: ${blackPlayer}`);
        }
        catch (error) {
            console.error('[GameManager Error] Failed to create and save game to DB:', error);
        }
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
            history: game.moveHistory,
            timeControl: game.timeControl,
            type: game.type
        });
    }
}

export default GameManager;