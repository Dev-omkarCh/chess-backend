// utils/elo.js

/**
 * Calculates expected score for a player against an opponent
 * @param {number} playerElo 
 * @param {number} opponentElo 
 * @returns {number} Expected score between 0 and 1
 */
function getExpectedScore(playerElo, opponentElo) {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculates new Elo ratings for both players after a match
 * @param {number} whiteElo - Current Elo of White player
 * @param {number} blackElo - Current Elo of Black player
 * @param {string} result - 'white_win', 'black_win', or 'draw'
 * @param {number} k - K-factor (default 32)
 * @returns {object} { newWhiteElo, newBlackElo, whiteChange, blackChange }
 */
export function calculateNewElos(whiteElo, blackElo, result, k = 32) {
    // 1. Get expected scores
    const expectedWhite = getExpectedScore(whiteElo, blackElo);
    const expectedBlack = getExpectedScore(blackElo, whiteElo);

    // 2. Determine actual scores (1 for win, 0.5 for draw, 0 for loss)
    let actualWhite = 0.5;
    let actualBlack = 0.5;

    if (result === 'white_win') {
        actualWhite = 1;
        actualBlack = 0;
    } else if (result === 'black_win') {
        actualWhite = 0;
        actualBlack = 1;
    }

    // 3. Calculate rating changes
    const whiteChange = Math.round(k * (actualWhite - expectedWhite));
    const blackChange = Math.round(k * (actualBlack - expectedBlack));

    // 4. Compute final Elos (ensuring Elo doesn't drop below 100)
    const newWhiteElo = Math.max(0, whiteElo + whiteChange);
    const newBlackElo = Math.max(0, blackElo + blackChange);

    return {
        newWhiteElo,
        newBlackElo,
        whiteChange: newWhiteElo - whiteElo,
        blackChange: newBlackElo - blackElo
    };
}