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
    },
    streaks: {
        type: Number,
        default: 0,
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcryptjs.hash(this.password, 10);
});

// Handle streaks logic before saving
// userSchema.pre('save', function (next) {
//     if (this.isModified('lastLogin')) {
//         const now = new Date();
//         const lastLogin = this.lastLogin || new Date(0);

//         // Normalize both dates to midnight (00:00:00) to compare calendar days
//         const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         const lastDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());

//         const diffInMs = today - lastDate;
//         const oneDayInMs = 24 * 60 * 60 * 1000;

//         if (diffInMs === 0) {
//             // Same calendar day: Keep streak as is
//         } else if (diffInMs === oneDayInMs) {
//             // Exactly the next calendar day: Increment
//             this.streaks += 1;
//         } else {
//             // More than one day missed: Reset
//             this.streaks = 1; // Usually, a login after a break starts a 1-day streak
//         }
//     }
//     next();
// });

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