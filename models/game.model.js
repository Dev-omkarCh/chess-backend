import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    // Players
    white: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    black: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Live State
    fen: {
        type: String,
        default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    pgn: { type: String, default: '' }, // Full history for replay/analysis
    turn: { type: String, enum: ['w', 'b'], default: 'w' }, // Added for easy querying
    history: [
        {
            from: String,
            to: String,
            piece: String,
            san: String, // e.g., "e4", "Nf3"
            timestamp: { type: Date, default: Date.now }
        }
    ],

    // 3. Match Configuration
    timeControl: {
        type: String,
        enum: ['1+0', '3+0', '5+0', '10+0', '30+0'],
        required: true
    },
    timer: {
        white: { type: Number }, // Time remaining in milliseconds
        black: { type: Number },
        lastMoveTimestamp: { type: Date, default: Date.now }
    },

    // 4. Status
    status: {
        type: String,
        enum: ['active', 'draw', 'checkmate', 'stalemate', 'resignation', 'timeout', 'abandoned'],
        default: 'active'
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // 5. Metadata
    isRated: { type: Boolean, default: true },
    gameType: { type: String, enum: ['random', 'friend'], default: 'random' },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
    }

}, { timestamps: true });

// Index for performance when fetching a user's match history
gameSchema.index({ white: 1, black: 1, status: 1 });

const Game = mongoose.model("Game", gameSchema);
export default Game;
