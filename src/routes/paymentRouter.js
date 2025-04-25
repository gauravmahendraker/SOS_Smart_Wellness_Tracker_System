import express from "express";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();
router.post('/create-order', ensureAuthenticated, ensureRole('patient'), createOrder );
router.post('/verify', ensureAuthenticated, ensureRole('patient'), verifyPayment);

export default router;