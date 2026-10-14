import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
    whitePlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    blackPlayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null if draw/ongoing
    },
    status: {
        type: String,
        enum: ['ongoing', 'completed', 'aborted', 'timeout'],
        default: 'ongoing'
    },
    resultReason: {
        type: String
    }, // e.g., "checkmate", "resignation", "draw"
    timeControl: {
        type: String,
        required: true
    }, // e.g., "3+0", "10+0"
    type: {
        type: String,
        enum: ['rated', 'unrated'],
        default: 'rated'
    },
    pgn: {
        type: String,
        default: ''
    }, // Portable Game Notation - standard for chess history
    moves: [{
        type: String
    }],          // Array of SAN moves (e.g., ["e4", "e5", "Nf3"])
    eloChanges: {
        whiteChange: { type: Number, default: 0 },
        blackChange: { type: Number, default: 0 }
    },
    fen: {
        type: String,
        default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    whiteEloAfter: { type: Number },
    blackEloAfter: { type: Number }
}, { timestamps: true });

export default mongoose.model('Game', gameSchema);