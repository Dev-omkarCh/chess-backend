import { cookieOptions } from "../config/cookieConfig.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });  // Skip validation for other fields

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error while generating access and refresh tokens");
    }
};

export const signup = asyncHandler(async (req, res) => {
    const { username, email, password, gender, fullName } = req.body;

    console.log("Signup Request Body:", req.body); // Debugging line to check incoming data

    // Check if any field is missing or empty
    if ([username, email, password, gender, fullName].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    // Check if user with the same username or email already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    
    const newUser = await User.create({ username, email, password, gender, fullName });

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id);
    const user = await User.findByIdAndUpdate(newUser._id, {
        refreshToken : refreshToken
    });

    return res.status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .clearCookie("accessToken", accessToken, cookieOptions) // Clear any existing access token
        .json(
            new ApiResponse(200, { accessToken, user }, "Signup successful")
        );
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if ([email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate tokens 
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res.status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(
            new ApiResponse(200, { accessToken, user }, "Login successful")
        );

});

export const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined // Clear the token
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("refreshToken", cookieOptions)
        .clearCookie("accessToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {

    // Get token from cookies or Authorization header (Bearer <token>)
    const incomingRefreshToken = req.cookies.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {

        // Verify the Refresh Token
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        if(!decodedToken?._id) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // 3. Find user in DB
        const user = await User.findById(decodedToken?._id);

        if (!user) {
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

export const getProfile = asyncHandler(async (req, res) => { });
export const updateProfile = asyncHandler(async (req, res) => { });
export const deleteProfile = asyncHandler(async (req, res) => { });