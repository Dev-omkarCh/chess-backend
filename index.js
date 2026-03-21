import dotenv from "dotenv";
dotenv.config();

import connectDb from "./config/db.js";
import { httpServer } from "./app.js";

const PORT = process.env.PORT || 3000;

connectDb();

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];

httpServer.listen(PORT, () => {
    console.log(`[Server] Allowed Origins:`);
    console.table(allowedOrigins);
    console.log(`[Server] Server is running on port ${PORT}`);
});