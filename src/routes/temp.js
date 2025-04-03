import express from "express";
import { google } from "googleapis";
import Appointment from "../models/Appointment.js";
import MedicalRecord from "../models/MedicalRecord.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { uploadToCloudinary } from "../utils/uploadCloudinary.js";
import { refreshAccessToken, createGoogleCalendarEvent } from "../utils/calendarUtils.js";
const router = express.Router();
import multer from "multer";

//To do to mark booked slot as busy so that it isnt shown in available slots.
// To add oAuth layers to slot
//extract patientId from jwt token
//make code modular by delaing routes with controller rather than putting code in router

router.post("/available-slots", async (req, res) => {
    try {
        const { doctorId, date, timeZone } = req.body;

        const doctor = await Doctor.findById(doctorId);
        if (!doctor || !doctor.calendarLink) {
            return res.status(404).json({ error: "Doctor or Calendar not found" });
        }
        doctor.accessToken = await refreshAccessToken(doctor.refreshToken);
        doctor.save();
        // Initialize OAuth2 client
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: doctor.accessToken,
            refresh_token: doctor.refreshToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Define the start and end of the day in ISO format
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Call Google Calendar FreeBusy API
        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                timeZone,
                items: [{ id: doctor.calendarLink }],
            },
        });

        const busySlots = response.data.calendars[doctor.calendarLink].busy;

        // Define working hours (e.g., 9 AM to 5 PM)
        const workingHoursStart = new Date(startOfDay);
        workingHoursStart.setHours(9, 0, 0, 0);
        const workingHoursEnd = new Date(startOfDay);
        workingHoursEnd.setHours(17, 0, 0, 0);

        // Generate all possible time slots (e.g., 30 min slots)
        let availableSlots = [];
        let currentSlot = new Date(workingHoursStart);

        while (currentSlot < workingHoursEnd) {
            let nextSlot = new Date(currentSlot.getTime() + 30 * 60000); // Add 30 mins

            // Check if the slot overlaps with any busy slot
            let isFree = busySlots.every(
                (busy) =>
                    new Date(busy.end) <= currentSlot || new Date(busy.start) >= nextSlot
            );

            if (isFree) {
                availableSlots.push({ start: currentSlot, end: nextSlot });
            }

            currentSlot = nextSlot;
        }
        // console.log('Available Slots Sent');
        res.json({ availableSlots });
    } catch (error) {
        console.error("Error fetching available slots:", error);
        res.status(500).json({ error: "Error fetching available slots" });
    }
});


// Route to create an appointment and add to Google Calendar
router.post("/appointments", async (req, res) => {
    try {
        const { doctorId, patientId, timeSlotStart, duration, timeZone } = req.body;
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ error: "Doctor not found" });
        const appointmentDate = new Date(timeSlotStart).toISOString().split("T")[0];
        const appointment = new Appointment({
            doctor: doctorId,
            patient: patientId,
            date: appointmentDate,
            timeSlotStart,
            duration,
            timeZone,
        });
        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ error: "Patient not found" });
        const googleEventId = await createGoogleCalendarEvent(doctor, patient, appointment);
        appointment.googleEventId = googleEventId;
        await appointment.save();
        res.status(201).json({ message: "Appointment created successfully", appointment });
    } catch (error) {
        console.error("Error creating appointment:", error);
        res.status(500).json({ error: "Failed to create appointment" });
    }
});

const upload = multer({ storage: multer.memoryStorage() });
router.post("/upload-prescription", upload.single("file"), async (req, res) => {
    try {
        const { appointmentId, doctorId, patientId } = req.body;
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // Upload to Cloudinary
        const fileUrl = await uploadToCloudinary(req.file);

        // Save record
        const record = new MedicalRecord({
            appointment: appointmentId,
            doctor: doctorId,
            patient: patientId,
            fileUrl: fileUrl,
        });
        await record.save();

        res.status(201).json({ message: "Prescription uploaded successfully", record });
    } catch (error) {
        console.error("Error uploading prescription:", error);
        res.status(500).json({ error: "Failed to upload prescription" });
    }
});

export default router;
