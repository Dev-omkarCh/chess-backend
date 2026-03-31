import { Router } from "express";
import { clearTokens, getCurrentUser, getUserProfile, refreshAccessToken, searchUsers } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/credentials").get(verifyJWT, getCurrentUser);

router.route("/:id").get(verifyJWT, getUserProfile);
router.route("/search").get(verifyJWT, searchUsers);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/clear-tokens").post(clearTokens);

export default router;
