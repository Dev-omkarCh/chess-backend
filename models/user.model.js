import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    fullName: {
        type: String,
    },
    profilePicture: {
        type: String,
    },
    bio: {
        type: String,
    },
    elo: {
        type: Number,
        default: 100,
    },
    friends: {
        type: [mongoose.Schema.Types.ObjectId],
        default: [],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
    },
    refreshToken: {
        type: String,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcryptjs.hash(this.password, 10);
});

// Customize JSON output to exclude sensitive fields
userSchema.set('toJSON', {
    transform: (doc, user) => {
        delete user.password;
        delete user.refreshToken;
        delete user.__v; // Remove version key too!
        return user;
    }
});

// Custom Methods

// It is used here because, if you ever decide to switch from bcryptjs to argon2 (a more modern hashing algorithm), 
// you would have to search your entire project for every controller that uses bcrypt.compare()

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcryptjs.compare(password, this.password);
}

userSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const User = mongoose.model("User", userSchema);
export default User;