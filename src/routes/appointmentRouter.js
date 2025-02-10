import express from "express";
import {
    checkAvailability,
    bookAppointment,
    cancelAppointment,
    getDoctorAppointments,
} from "../controllers/appointmentController.js";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";

const appointmentRouter = express.Router();

// Routes for patient to book and cancel appointments
appointmentRouter.post("/check-availability", ensureAuthenticated, ensureRole('patient'), checkAvailability);
appointmentRouter.post("/book", ensureAuthenticated, ensureRole('patient'), bookAppointment);
appointmentRouter.post("/cancel", ensureAuthenticated, ensureRole('patient'), cancelAppointment);

// Routes for doctor to view and cancel appointments
appointmentRouter.get("/doctor/booked-slots", ensureAuthenticated, ensureRole('doctor'), getDoctorAppointments);
appointmentRouter.post("/doctor/cancel", ensureAuthenticated, ensureRole('doctor'), cancelAppointment);

export default appointmentRouter;
