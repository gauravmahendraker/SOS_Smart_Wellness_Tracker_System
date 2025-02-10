import express from "express";
import {
    checkAvailability,
    bookAppointment,
    cancelAppointment,
} from "../controllers/appointmentController.js";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";

const appointmentRouter = express.Router();

// Routes for patient to book and cancel appointments
appointmentRouter.post("/check-availability", ensureAuthenticated, ensureRole('patient'), checkAvailability);
appointmentRouter.post("/book", ensureAuthenticated, ensureRole('patient'), bookAppointment);
appointmentRouter.post("/cancel", ensureAuthenticated, ensureRole('patient'), cancelAppointment);

export default appointmentRouter;
