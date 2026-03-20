import dotenv from "dotenv";
dotenv.config();

import connectDb from "./config/db.js";
import { httpServer } from "./app.js";

const PORT = process.env.PORT || 3000;

connectDb();

httpServer.listen(PORT, () => {
    console.log(`\n[Server] Allowed Cors Origins : [ "${process.env.FRONTEND_URL}" ]`)
    console.log(`[Server] Server is running on port ${PORT}\n`);
});