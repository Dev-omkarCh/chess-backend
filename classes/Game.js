import { Chess } from 'chess.js';

export class Game {
    constructor(gameId, p1, p2, io) {
        this.gameId = gameId;
        this.white = p1; // p1 is white
        this.black = p2;
        this.io = io;
        this.board = new Chess();
        this.moveHistory = [];
    }

    makeMove(userId, move) {
        // 1. Is it this user's turn?
        console.log(`[Move Attempt] User ID: ${userId} is attempting move:`, move);
        const turn = this.board.turn(); // 'w' or 'b'
        const expectedUser = turn === 'w' ? this.white : this.black;

        if (userId !== expectedUser) return;

        // 2. Attempt the move
        try {
            const result = this.board.move(move); //expects { from, to, promotion? }
            if (result) {
                console.log(`[Move Success] User ID: ${userId} made move:`, result);
                // 3. Broadcast to the game room
                this.io.to(this.gameId).emit('game:move-made', {
                    move: result,
                    fen: this.board.fen(),
                    turn: this.board.turn()
                });

                // Check for game over
                if (this.board.isGameOver()) {
                    this.io.to(this.gameId).emit('game:over', {
                        winner: this.board.turn() === 'w' ? 'black' : 'white',
                        reason: this.board.isCheckmate() ? 'checkmate' : 'draw'
                    });
                }
            }
        } catch (e) {
            console.error("Invalid move attempted:", move);
        }
    }
}