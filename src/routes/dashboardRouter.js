import express from "express";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";
import { getDoctor, getPatient } from "../controllers/dashboardController.js";

const router = express.Router();
router.get('/doctor', ensureAuthenticated, ensureRole('doctor'), getDoctor );
router.get('/patient', ensureAuthenticated, ensureRole('patient'), getPatient );

export default router;