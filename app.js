import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initSocket } from './socket.js';
// const helmet = require('helmet'); // Adds security headers
// const morgan = require('morgan'); // Logs requests to the console

const app = express();
const httpServer = createServer(app);

// Security Middleware
// app.use(helmet()); 

// Socket.io Setup
initSocket(httpServer);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];

// CORS Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.set("trust proxy", 1);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Logging (Helpful for debugging mobile requests)

// if (process.env.NODE_ENV === 'development') {
//     app.use(morgan('dev'));
// }


import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import cookieParser from 'cookie-parser';

app.use((err, req, res, next) => {
    // 1. Determine the status code (Ensure it is a valid HTTP number)
    let statusCode = err.statusCode || 500;

    // 2. If it's a Mongoose/MongoDB error, it might not have a valid HTTP status
    if (typeof statusCode !== "number" || statusCode < 100 || statusCode > 599) {
        statusCode = 500;
    }

    // 3. Send the clean response
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || []
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

export { httpServer }; // Add this named export
export default app;