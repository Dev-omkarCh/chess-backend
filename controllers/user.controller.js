import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateAccessAndRefreshTokens } from "./auth.controller.js";
import { cookieOptions } from "../config/cookieConfig.js";
import mongoose from "mongoose";

/**
 * Get current user
 * @route GET /api/users/current-user
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request");
    }

    const user = await User.findById(req.user._id).select("-password -refreshToken");

    return res.status(200)
        .json(
            new ApiResponse(200, user, "User fetched successfully")
        );
});

/**
 * Refresh access token
 * @route POST /api/users/refresh-token
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {

    // Get token from cookies or Authorization header (Bearer <token>)
    const incomingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {

        // Verify the Refresh Token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (!decodedToken?._id) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // 3. Find user in DB
        const user = await User.findById(decodedToken?._id);

        if (!user && !user._id) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Compare incoming token with DB token
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        // 5. Generate NEW tokens (Rotation)
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        // 6. Send response
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

/**
 * Clear access and refresh tokens
 * @route POST /api/users/clear-tokens
 */
export const clearTokens = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .cookie("accessToken", "")
        .cookie("refreshToken", "")
        .json(
            new ApiResponse(
                200,
                null,
                "Cleared Tokens"
            )
        );
});

/**
 * Search for users by username or email
 * @route GET /api/users/search?query=username
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const currentUserId = req.user._id;

    if (!query) {
        throw new ApiError(400, "Search query is required");
    }

    const currentObjId = new mongoose.Types.ObjectId(String(currentUserId));

    const results = await User.aggregate([
        {
            $match: {
                username: { $regex: query, $options: 'i' },
                _id: { $ne: currentObjId }
            }
        },
        { $limit: 15 },
        {
            $lookup: {
                from: 'friendships',
                let: { searchedId: '$_id', me: currentObjId },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    // Use 'recipient' here to match your DB schema
                                    { $or: [{ $eq: ['$sender', '$$searchedId'] }, { $eq: ['$recipient', '$$searchedId'] }] },
                                    { $or: [{ $eq: ['$sender', '$$me'] }, { $eq: ['$recipient', '$$me'] }] }
                                ]
                            }
                        }
                    }
                ],
                as: 'friendship'
            }
        },
        {
            $addFields: {
                friendship: { $arrayElemAt: ['$friendship', 0] }
            }
        },
        {
            $project: {
                username: 1,
                profilePicture: 1,
                elo: 1,
                fullName: 1,
                // Logic for mapping status
                status: {
                    $cond: {
                        if: { $not: ['$friendship'] },
                        then: 'not_friend',
                        else: {
                            $cond: {
                                if: { $eq: ['$friendship.status', 'pending'] },
                                then: {
                                    $cond: [
                                        { $eq: ['$friendship.sender', currentObjId] },
                                        'request_sent',
                                        'request_received'
                                    ]
                                },
                                else: '$friendship.status' // Returns 'accepted', 'rejected', or 'blocked'
                            }
                        }
                    }
                },
                sentByMe: { $eq: ['$friendship.sender', currentObjId] }
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, results, "Users fetched successfully"));
});