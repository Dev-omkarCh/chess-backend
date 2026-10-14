import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getUserRecentGameHistory } from "../controllers/game.controller.js";

const router = Router();

router.route("/:userId/recent").get(verifyJWT, getUserRecentGameHistory);

export default router;