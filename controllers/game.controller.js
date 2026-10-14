import gameModel from "../models/game.model.js";

// Get limited Recent played Games
export const getUserRecentGameHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        console.log('Request Recent Game history : ', userId);

        const games = await gameModel.find({
            $or: [{ whitePlayer: userId }, { blackPlayer: userId }],
            status: 'completed' // Only finished games
        })
            .populate('whitePlayer blackPlayer', 'username elo') // Pull opponent/player names and elo
            .limit(8)
            .sort({ createdAt: -1 }); // Newest first

        // RecentGame {
        //     id: string;
        //     opponent: string;
        //     opponentRating: number;
        //     result: GameResult;
        //     eloChange: number;
        //     opening: string;
        //     timeControl: TimeControl;
        //     /** ISO 8601 */
        //     playedAt: string;
        //     /** Final position (FEN) */
        //     fen: string;
        // }

        const formattedGames = games.map((game) => {
            const isWhitePlayer = game.whitePlayer._id.toString() === userId;
            const result = game.winner.toString() === userId ? "win" : game.winner.toString() === null ? "draw" : "loss";

            return {
                id: game._id,
                fen: game.fen,
                opponent: isWhitePlayer ? game.blackPlayer?.username : game.whitePlayer?.username,
                opponentRating: isWhitePlayer ? game.blackEloAfter : game.whiteEloAfter,
                result,
                eloChange: isWhitePlayer ? game.eloChanges.whiteChange : game.eloChanges.blackChange,
                opening: "standard",
                timeControl: game.timeControl,
                playedAt: game.updatedAt,
            }
        });

        console.log("formattedGames", formattedGames);

        res.status(200).json({ success: true, games: formattedGames });
    } catch (error) {
        console.error('[Game History Error]:', error);
        res.status(500).json({ success: false, message: 'Server error fetching game history' });
    }
};

// Check if the user has an ongoing game (for dashboard toast/popup)
export const getOngoingGame = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find any active game where user is a participant and status is ongoing
        const activeGame = await GameModel.findOne({
            $or: [{ whitePlayer: userId }, { blackPlayer: userId }],
            status: 'ongoing'
        }).populate('whitePlayer blackPlayer', 'username elo');

        if (!activeGame) {
            return res.status(200).json({ success: true, activeGame: null });
        }

        res.status(200).json({ success: true, activeGame });
    } catch (error) {
        console.error('[Ongoing Game Error]:', error);
        res.status(500).json({ success: false, message: 'Server error checking ongoing game' });
    }
};

export const getGameById = async (req, res) => {
    try {
        const { gameId } = req.params;

        const game = await gameModel.findById(gameId).populate('whitePlayer blackPlayer', 'username elo');

        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        res.status(200).json({ success: true, game });
    } catch (error) {
        console.error('[Game By ID Error]:', error);
        res.status(500).json({ success: false, message: 'Server error fetching game by ID' });
    }
};

