import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcryptjs";

export const signup = asyncHandler(async (req, res) => {
    const { username, email, password, gender, fullName } = req.body;

    // Check if any field is missing or empty
    if ([username, email, password, gender, fullName].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user with the same username or email already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const user = await User.create({ username, email, password, gender, fullName });

    // 5. Remove password from response for security
    const createdUser = await User.findById(user._id).select("-password");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "Signup was successful")
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate tokens 
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // Save refresh token to DB 
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });  // Skip validation for other fields

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Set secure flag in production
        sameSite: "None", // Adjust as needed (e.g., "Lax" or "None" or "Strict")
    };

    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, { accessToken, user }, "Login successful")
    );



});
export const logout = asyncHandler(async (req, res) => { });
export const getProfile = asyncHandler(async (req, res) => { });
export const updateProfile = asyncHandler(async (req, res) => { });
export const deleteProfile = asyncHandler(async (req, res) => { });