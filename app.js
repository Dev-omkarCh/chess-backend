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
    origin: [FRONTEND_URL],
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

app.use('/api/auth', authRoutes);

export default app;