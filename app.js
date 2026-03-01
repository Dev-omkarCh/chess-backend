import express from 'express';
import cors from 'cors';
// const helmet = require('helmet'); // Adds security headers
// const morgan = require('morgan'); // Logs requests to the console

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Security Middleware
// app.use(helmet()); 

// CORS Configuration
app.use(cors({
    origin: "http://localhost:3000",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging (Helpful for debugging mobile requests)

// if (process.env.NODE_ENV === 'development') {
//     app.use(morgan('dev'));
// }


import authRoutes from './routes/auth.routes.js';

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

export default app;