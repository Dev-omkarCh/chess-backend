import express from 'express';
const router = express.Router();
import { createOrder, verifyPayment } from "../controllers/payment.controller.js";

router.post('/order', createOrder);
router.post('/verify', verifyPayment);

export default router;