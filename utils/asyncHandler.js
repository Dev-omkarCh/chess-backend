
/**
 * Asynchronous handler for Express routes.
 *
 * This function wraps an asynchronous route handler and catches any errors that occur,
 * sending a standardized error response to the client.
 *
 * @param {Function} fn - The asynchronous route handler function to wrap.
 * @returns {Function} A new function that wraps the original route handler with error handling.
 * 
 */

const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        });
    };
};

/**
 * Asynchronous handler for Express routes using Promises.
 *
 * This function wraps an asynchronous route handler and catches any errors that occur,
 * sending a standardized error response to the client.
 *
 * @param {Function} fn - The asynchronous route handler function to wrap.
 * @returns {Function} A new function that wraps the original route handler with error handling.
 * 
*/

export const asyncHandlerPromise = (requestHandler) => {
    return (req, res, next) => {
        Promise
            .resolve(requestHandler(req, res, next))
            .catch((error) => next(error));
    };
};

export default asyncHandler;