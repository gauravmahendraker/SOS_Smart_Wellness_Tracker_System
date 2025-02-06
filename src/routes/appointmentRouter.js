import express from "express";
import {
    checkAvailability,
    bookAppointment,
    cancelAppointment,
} from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

// Routes with controller functions
appointmentRouter.post("/check-availability", checkAvailability);
appointmentRouter.post("/book", bookAppointment);
appointmentRouter.post("/cancel", cancelAppointment);

export default appointmentRouter;
