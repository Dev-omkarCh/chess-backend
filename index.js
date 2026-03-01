import dotenv from "dotenv";
dotenv.config();

import connectDb from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

connectDb();

app.listen(PORT, () => {
    console.log(`Allowed Cors Origins : [ "${process.env.FRONTEND_URL}" ]`)
    console.log(`Server is running on port ${PORT}`);
});