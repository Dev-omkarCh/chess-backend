import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log(`[Database] Connected to MongoDB!`);
    } catch (error) {
        console.log(`[Database] Connection failed: ${error}`);
        process.exit(1); // Exit with failure
    }
};

export default connectDB;