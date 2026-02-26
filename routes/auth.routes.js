import express from 'express';
import { deleteProfile, getProfile, login, logout, refreshAccessToken, signup, updateProfile } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

// Why use router.route() instead of router.get(), router.post() etc.?
// Using router.route() allows us to chain multiple HTTP methods for the same route, which can make the code cleaner and more organized. 
// For example, we can define all operations related to "/profile" in one place, rather than having separate definitions for GET, PUT, DELETE etc. 
// It also helps to group related routes together, improving readability and maintainability of the code.

router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/logout").post(verifyJWT, logout);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/profile")
    .get(verifyJWT, getProfile)
    .put(verifyJWT, updateProfile)
    .delete(verifyJWT, deleteProfile);

export default router;