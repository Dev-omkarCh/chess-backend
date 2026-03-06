import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateAccessAndRefreshTokens } from "./auth.controller.js";

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

        console.log(accessToken);
        console.log(newRefreshToken);

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