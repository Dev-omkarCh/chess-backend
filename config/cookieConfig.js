export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set secure flag in production
    sameSite: "None", // Adjust as needed (e.g., "Lax" or "None" or "Strict")
};