import { Router } from "express";
import { clearTokens, getCurrentUser, refreshAccessToken } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/credentials").get(verifyJWT, getCurrentUser);

// Using POST ensures the operation is secure (data is in the body, not the URL), 
// prevents caching, and adheres to the REST principle that sensitive state-changing operations should never be GET.
router.route("/refresh-token").post(refreshAccessToken);
router.route("/clear-tokens").post(clearTokens);

export default router;
