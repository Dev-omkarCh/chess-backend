import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // Get token from Authorization header (Bearer token) or cookies
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // 2. Decode the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (!decodedToken?._id) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // 3. Find user in DB (we don't need their password or refresh token here)
        const user = await User.findById(decodedToken?._id).select("_id email role");

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // 4. Attach user object to the request
        req.user = user;

        // 5. Move to the next function (Controller)
        next();

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});