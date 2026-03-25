import { cookieOptions } from "../config/cookieConfig.js";
import Setting from "../models/setting.model.js";
import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

/**
 * 
 * @param {*} userId 
 * @returns {*} accessToken and refreshToken
 * @description This function generates access and refresh tokens for a given user ID, saves the refresh token in the database, and returns both tokens. It is used in both the signup and login processes to ensure that the user receives valid tokens upon successful authentication.
 */
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

    const avatarGender = gender === "female" ? "girl" : "boy";

    const boyProfilePic = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}&hair=short01&beardProbability=100`;
    const girlProfilePic = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}&hair=long01&beardProbability=0`;

    const avatar = avatarGender === "boy" ? boyProfilePic : girlProfilePic;

    const newUser = await User.create({ username, email, password, gender, fullName, avatar });

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id);
    const user = await User.findByIdAndUpdate(newUser._id, {
        refreshToken: refreshToken
    });

    await Setting.create({ userId: newUser._id });

    console.log("[Signup] New user created:", newUser._id.toString());
    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
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

    const updatedUser = await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date() // Update last login time
    }, { new: true });

    console.log("[Login] User logged in:", updatedUser._id.toString());
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

    console.log("[Logout] User logged out:", req.user._id?.toString());
    return res
        .status(200)
        .clearCookie("refreshToken", cookieOptions)
        .clearCookie("accessToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
});

export const getProfile = asyncHandler(async (req, res) => { });
export const updateProfile = asyncHandler(async (req, res) => { });
export const deleteProfile = asyncHandler(async (req, res) => { });

/**
 * @URL /api/v1/auth/google
 * @method POST
 * @description This function handles Google authentication by verifying the Google ID token, creating a new user if the user doesn't exist, or updating the existing user with the latest Google data. It then generates access and refresh tokens and returns them along with the user information.
 */
export const googleAuth = async (req, res) => {
    const { token } = req.body; // The token from Frontend

    // console.log(`[Google Login] Credential: ${credential}`);
    try {
        // Verify with Google
        const googleRes = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`
        );
        const { email, sub: googleId, name, picture } = await googleRes.json();

        if (!email) throw new Error("Invalid Google Token");

        console.log(`[Google Login] Email: ${email}, Google ID: ${googleId}, Name: ${name}, Picture: ${picture}`);
        // Account Linking Logic
        let user = await User.findOne({ email });

        if (user) {
            // If user exists but doesn't have Google linked, link it now
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
                await user.save({ validateBeforeSave: false });
            }
        } else {
            // Create New User
            user = await User.create({
                username: name,
                email,
                googleId,
                avatar: picture,
                authProvider: 'google',
            });

            await Setting.create({ userId: user._id });
        }

        // Issue your OWN JWT for your platform
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        res.status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(new ApiResponse(200, { accessToken, user }, "Google Auth successful"));
    } catch (error) {
        res.status(401).json(new ApiResponse(401, {}, error.message));
    }
};