import express from "express";
import {
    checkAvailability,
    bookAppointment,
    cancelAppointment,
    getDoctorAppointments,
    getPatientAppointments,
    getAppointmentDetails,
    addMedicalRecord,
} from "../controllers/appointmentController.js";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";
import multer from "multer";

const appointmentRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Routes for patient to view, book and cancel appointments
appointmentRouter.get("/my-appointments", ensureAuthenticated, ensureRole('patient'), getPatientAppointments);
appointmentRouter.post("/check-availability", ensureAuthenticated, ensureRole('patient'), checkAvailability);
appointmentRouter.post("/book", ensureAuthenticated, ensureRole('patient'), bookAppointment);
appointmentRouter.post("/cancel", ensureAuthenticated, ensureRole('patient'), cancelAppointment);

// Routes for doctor to view and cancel appointments
appointmentRouter.get("/doctor/booked-slots", ensureAuthenticated, ensureRole('doctor'), getDoctorAppointments);
appointmentRouter.post("/doctor/cancel", ensureAuthenticated, ensureRole('doctor'), cancelAppointment);
appointmentRouter.post("/doctor/upload-prescription", ensureAuthenticated, ensureRole('doctor'),upload.single("file"), addMedicalRecord);

// Route for doctor and patient to get appointment details
appointmentRouter.post("/appointment-details", ensureAuthenticated, ensureRole('any'), getAppointmentDetails);
export default appointmentRouter;
