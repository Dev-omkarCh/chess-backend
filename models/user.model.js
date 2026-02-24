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
    username : {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    fullName : {
        type: String,
    },
    profilePicture : {
        type: String,
    },
    bio : {
        type: String,
    },
    friends : {
        type : [mongoose.Schema.Types.ObjectId],
        default : [],
    },
    isVerified : {
        type: Boolean,
        default: false,
    },
    gender : {
        type: String,
        enum: ["Male", "Female", "Other"],
    },
    refreshTokens : {
        type: [String],
        default: [],
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcryptjs.hash(this.password, 10);
    next();
});

// Customize JSON output to exclude sensitive fields
userSchema.set('toJSON', {
    transform: (doc, user) => {
        delete user.password;
        delete user.refreshTokens;
        delete user.__v; // Remove version key too!
        return user;
    }
});

// Custom Methods

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