export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set secure flag in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Set SameSite to None in production for cross-site cookies
};