import { Chess } from 'chess.js';
import User from '../models/user.model.js';
import { calculateNewElos } from '../utils/elo.js';

export class Game {
    constructor(gameId, p1, p2, io, prefs, dbGame) {
        this.gameId = gameId;
        this.white = p1; // p1 is white
        this.black = p2;
        this.io = io;
        this.timeControl = prefs.timeControl;
        this.type = prefs.type;

        this.dbGame = dbGame;

        this.board = new Chess();
        this.moveHistory = [];
    }

    makeMove(userId, moveData) {

        // Verify whose turn it is
        console.log(`[Move Attempt] User ID: ${userId} is attempting move:`, moveData);
        const turnColor = this.board.turn(); // 'w' or 'b'
        const expectedUser = turnColor === 'w' ? this.white : this.black;

        if (userId !== expectedUser) return;

        // Attempt the move
        try {
            const move = this.board.move(moveData); //expects { from, to, promotion? }
            if (!move) return;

            this.moveHistory.push(move.san);
            console.log(`[Move Success] User ID: ${userId} made move:`, move);

            // Broadcast to the game room
            this.io.to(this.gameId).emit('game:move-made', {
                move,
                fen: this.board.fen(),
                turn: this.board.turn(),
                history: this.moveHistory,
            });

            // Check for game over
            if (this.board.isGameOver()) {
                // this.io.to(this.gameId).emit('game:over', {
                //     winner: this.board.turn() === 'w' ? 'black' : 'white',
                //     reason: this.board.isCheckmate() ? 'checkmate' : 'draw'
                // });
                this.handleGameOver();
            }

        } catch (error) {
            console.error(`[Game Error] Invalid move attempted in game ${this.gameId}:`, error);
        }
    }

    // async handleGameOver() {
    //     let winnerId = null;
    //     let resultReason = 'draw';

    //     if (this.board.isCheckmate()) {
    //         const winningColor = this.board.turn() === 'w' ? 'black' : 'white';
    //         winnerId = winningColor === 'white' ? this.white : this.black;
    //         resultReason = 'checkmate';
    //     } else if (this.board.isDraw()) {
    //         resultReason = 'draw';
    //     }

    //     try {
    //         // SINGLE WRITE TO MONGODB WHEN GAME ENDS
    //         this.dbGame.status = 'completed';
    //         this.dbGame.winner = winnerId;
    //         this.dbGame.resultReason = resultReason;
    //         this.dbGame.moves = this.moveHistory; // Save the full move array
    //         this.dbGame.pgn = this.board.pgn();   // Save the final PGN string
    //         this.dbGame.fen = this.board.fen();  // Save the final Fen string

    //         await this.dbGame.save();

    //         // Notify clients that the game has ended
    //         this.io.to(this.gameId).emit('game:over', {
    //             winner: winnerId,
    //             reason: resultReason,
    //             fen: this.board.fen(),
    //             pgn: this.dbGame.pgn
    //         });

    //         console.log(`[Game Over & Saved] Game ${this.gameId} finished. Winner: ${winnerId || 'Draw'} (${resultReason})`);

    //     } catch (error) {
    //         console.error(`[Game Error] Failed to save completed game ${this.gameId} to DB:`, error);
    //     }
    // }

    async handleGameOver() {
        let winnerId = null;
        let resultReason = 'draw';
        let resultType = 'draw'; // 'white_win', 'black_win', or 'draw'

        if (this.board.isCheckmate()) {
            const winningColor = this.board.turn() === 'w' ? 'black' : 'white';
            winnerId = winningColor === 'white' ? this.white : this.black;
            resultReason = 'checkmate';
            resultType = winningColor === 'white' ? 'white_win' : 'black_win';
        } else if (this.board.isDraw()) {
            resultReason = 'draw';
            resultType = 'draw';
        }

        try {
            // 1. Fetch current User documents for White and Black
            const whiteUser = await User.findById(this.white);
            const blackUser = await User.findById(this.black);

            let whiteChange = 0;
            let blackChange = 0;
            let newWhiteElo = 0;
            let newBlackElo = 0;

            // 2. Calculate ELO changes ONLY if it's a rated game and both users exist
            if (this.type === 'rated' && whiteUser && blackUser) {
                console.log(whiteUser.elo, blackUser.elo, resultType);
                const eloResults = calculateNewElos(whiteUser.elo, blackUser.elo, resultType);
                console.log(eloResults);

                whiteChange = eloResults.whiteChange;
                blackChange = eloResults.blackChange;
                newWhiteElo = eloResults.newWhiteElo;
                newBlackElo = eloResults.newBlackElo;

                // Update White Player Stats & Elo
                whiteUser.elo = newWhiteElo;
                // if (resultType === 'white_win') whiteUser.stats.wins += 1;
                // else if (resultType === 'black_win') whiteUser.stats.losses += 1;
                // else whiteUser.stats.draws += 1;
                await whiteUser.save();

                // Update Black Player Stats & Elo
                blackUser.elo = newBlackElo;
                // if (resultType === 'black_win') blackUser.stats.wins += 1;
                // else if (resultType === 'white_win') blackUser.stats.losses += 1;
                // else blackUser.stats.draws += 1;
                await blackUser.save();
            }

            // 3. Save Game Document in MongoDB
            this.dbGame.status = 'completed';
            this.dbGame.winner = winnerId;
            this.dbGame.resultReason = resultReason;
            this.dbGame.moves = this.moveHistory;
            this.dbGame.pgn = this.board.pgn();
            this.dbGame.eloChanges = {
                whiteChange,
                blackChange
            };
            this.dbGame.whiteEloAfter = newWhiteElo;
            this.dbGame.blackEloAfter = newBlackElo;
            this.dbGame.fen = this.board.fen();

            await this.dbGame.save();

            // 4. Notify clients of game over and their updated ELO ratings
            this.io.to(this.gameId).emit('game:over', {
                winner: winnerId,
                reason: resultReason,
                fen: this.board.fen(),
                pgn: this.dbGame.pgn,
                eloChanges: {
                    white: whiteChange,
                    black: blackChange
                }
            });

            console.log(`[Game Over] Game ${this.gameId} completed. Elo Updates -> White: ${whiteChange > 0 ? '+' : ''}${whiteChange}, Black: ${blackChange > 0 ? '+' : ''}${blackChange}`);

        } catch (error) {
            console.error(`[Game Error] Failed to process game over and ELO updates for ${this.gameId}:`, error);
        }
    }
}