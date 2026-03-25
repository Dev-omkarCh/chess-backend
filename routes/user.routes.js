import { Router } from "express";
import { clearTokens, getCurrentUser, refreshAccessToken, searchUsers } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/credentials").get(verifyJWT, getCurrentUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/clear-tokens").post(clearTokens);

router.route("/search").get(verifyJWT, searchUsers);

export default router;
