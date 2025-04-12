import { Doctor, Appointment, MedicalRecord } from "../models/export.js";
import moment from "moment-timezone";
import mongoose from "mongoose";
import { refreshAccessToken, createGoogleCalendarEvent } from "../utils/calendarUtils.js";

// Check availability for a doctor on a specific date
export const checkAvailability = async (req, res) => {
    const { doctor, date, timeZone } = req.body;

    try {
        const doctorExists = await Doctor.findById(doctor);
        if (!doctorExists) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Convert date to UTC range
        const dayStartUTC = moment.tz(`${date} 00:00:00`, timeZone).utc().toDate();
        const dayEndUTC = moment.tz(`${date} 23:59:59`, timeZone).utc().toDate();

        let availableSlotsForDate = doctorExists.availableSlots.filter((slot) => {
            return slot.start >= dayStartUTC && slot.end <= dayEndUTC;
        });

        // Convert available slots to requested time zone for display
        const formattedSlots = availableSlotsForDate.map((slot) => ({
            start: moment.utc(slot.start).tz(timeZone).format(),
            end: moment.utc(slot.end).tz(timeZone).format(),
        }));

        res.status(200).json({ message: "Available slots fetched successfully", data: formattedSlots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error checking availability", error });
    }
};

// Book an appointment
export const bookAppointment = async (req, res) => {
    const patientId = req.user.userId || req.user._id || req.user.id;
    console.log("Patient ID:", patientId);
    console.log("Decoded user:", req.user);
    const { doctor, date, timeSlotStart, duration, timeZone } = req.body;

    // Validation checks
    if (!doctor || !date || !timeSlotStart || !duration) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID not found in authentication token. Please log in again."
        });
    }

    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const doctorExists = await Doctor.findById(doctor).session(session);
        if (!doctorExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Find patient for calendar event
        const patient = await mongoose.model("Patient").findById(patientId);
        if (!patient) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Patient not found" });
        }

        // Convert requested times to UTC
        const requestedStartTime = moment.tz(timeSlotStart, timeZone).utc().toDate();
        const requestedEndTime = moment(requestedStartTime).add(duration, "minutes").toDate();

        // Validate availability
        if (!isSlotAvailable(doctorExists.availableSlots, requestedStartTime, requestedEndTime)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Requested time slot is not available" });
        }

        // Update available slots
        doctorExists.availableSlots = doctorExists.availableSlots.flatMap((slot) => {
            const slotStart = new Date(slot.start);
            const slotEnd = new Date(slot.end);

            if (requestedStartTime >= slotStart && requestedEndTime <= slotEnd) {
                const updatedSlots = [];
                if (requestedStartTime > slotStart) {
                    updatedSlots.push({ start: slotStart, end: requestedStartTime });
                }
                if (requestedEndTime < slotEnd) {
                    updatedSlots.push({ start: requestedEndTime, end: slotEnd });
                }
                return updatedSlots;
            }
            return [slot];
        });

        // Refresh doctor's Google Calendar access token if needed
        if (doctorExists.refreshToken) {
            doctorExists.accessToken = await refreshAccessToken(doctorExists.refreshToken);
        }

        // Save doctor with updated slots and tokens
        await doctorExists.save({ session });

        // Create appointment
        const appointmentData = {
            doctor,
            patient: patientId,
            date: moment.tz(date, timeZone).utc().toDate(),
            timeSlotStart: requestedStartTime,
            duration,
            timeZone,
            status: "confirmed",
        };

        const appointment = new Appointment(appointmentData);

        // Create Google Calendar event if doctor has calendar setup
        if (doctorExists.calendarLink && doctorExists.accessToken) {
            try {
                const googleEventId = await createGoogleCalendarEvent(doctorExists, patient, appointment);
                appointment.googleEventId = googleEventId;
            } catch (calendarError) {
                console.error("Error creating Google Calendar event:", calendarError);
                // Continue with appointment booking even if calendar event creation fails
            }
        }

        await appointment.save({ session });

        // If everything succeeded, commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ message: "Appointment booked successfully", data: appointment });
    } catch (error) {
        // If an error occurred, abort the transaction
        await session.abortTransaction();
        session.endSession();

        console.error(error);
        res.status(500).json({ message: "Error booking appointment", error: error.message });
    }
};

// Cancel an appointment
export const cancelAppointment = async (req, res) => {
    const { appointmentId } = req.body;

    try {
        // Find the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if already canceled
        if (appointment.status === "canceled") {
            return res.status(400).json({ message: "Appointment is already canceled" });
        }

        // Get doctor details
        const doctor = await Doctor.findById(appointment.doctor);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Cancel Google Calendar event if it exists
        if (appointment.googleEventId && doctor.accessToken && doctor.calendarLink) {
            try {
                // Refresh access token
                doctor.accessToken = await refreshAccessToken(doctor.refreshToken);
                await doctor.save(); // Save new access token

                const { google } = await import('googleapis');
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({
                    access_token: doctor.accessToken,
                    refresh_token: doctor.refreshToken,
                });

                const calendar = google.calendar({ version: "v3", auth: oauth2Client });

                // Extract calendarId from calendarLink
                const url = new URL(doctor.calendarLink);
                const calendarId = url.searchParams.get('src');

                // Delete the event
                await calendar.events.delete({
                    calendarId,
                    eventId: appointment.googleEventId,
                });
            } catch (calendarError) {
                if (calendarError.code === 410) {
                    console.warn("Google Calendar event already deleted.");
                } else {
                    console.error("Error canceling Google Calendar event:", calendarError);
                }
                // Proceed regardless
            }
        }

        // Update appointment status
        appointment.status = "canceled";
        await appointment.save();

        // Add slot back to doctor's availability
        const canceledSlotStart = new Date(appointment.timeSlotStart);
        const canceledSlotEnd = new Date(canceledSlotStart.getTime() + appointment.duration * 60000);

        // Refetch the doctor to avoid VersionError
        const updatedDoctor = await Doctor.findById(doctor._id);
        updatedDoctor.availableSlots.push({ start: canceledSlotStart, end: canceledSlotEnd });

        // Merge overlapping slots
        updatedDoctor.availableSlots = mergeSlots(updatedDoctor.availableSlots);
        doctor.markModified("availableSlots");
        await updatedDoctor.save();

        res.status(200).json({
            message: "Appointment canceled successfully and slot re-added to availability",
            data: {
                appointment,
                updatedSlots: updatedDoctor.availableSlots,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error canceling appointment", error });
    }
};

// Get all booked appointment slots for a doctor
export const getDoctorAppointments = async (req, res) => {
    try {
        const doctorId  = req.user.id;
        // Fetch all confirmed appointments for the doctor
        const appointments = await Appointment.find({
            doctor: doctorId,
            status: "confirmed",
        }).populate("patient", "name email"); // Populate patient details (optional)

        if (!appointments || appointments.length === 0) {
            return res.status(200).json({ message: "No booked appointments found", data: [] });
        }

        // Format the response
        const formattedAppointments = appointments.map((appointment) => ({
            _id:appointment._id,
            patientName: appointment.patient.name,
            patientEmail: appointment.patient.email,
            date: appointment.date,
            timeSlotStart: appointment.timeSlotStart,
            duration: appointment.duration,
            timeZone: appointment.timeZone,
            googleEventId: appointment.googleEventId || null,
        }));

        res.status(200).json({
            message: "Booked appointments fetched successfully",
            data: formattedAppointments,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching booked appointments", error });
    }
};

// Get all booked appointment slots for a patient
export const getPatientAppointments = async (req, res) => {
    try {
        const patientId = req.user.id;

        // Fetch all appointments for the patient (not just confirmed)
        const appointments = await Appointment.find({
            patient: patientId,
        }).populate("doctor"); // Populate doctor details

        if (!appointments || appointments.length === 0) {
            return res.status(200).json({ message: "No booked appointments found", data: [] });
        }

        // Format the response
        const formattedAppointments = appointments.map((appointment) => ({
            _id: appointment._id,
            doctorName: appointment.doctor.name,
            doctorSpecialization: appointment.doctor.specialization,
            date: appointment.date,
            timeSlotStart: appointment.timeSlotStart,
            duration: appointment.duration,
            timeZone: appointment.timeZone,
            status: appointment.status,
            googleEventId: appointment.googleEventId || null,
        }));

        res.status(200).json({
            message: "Booked appointments fetched successfully",
            data: formattedAppointments,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching booked appointments", error });
    }
};

// Get detailed appointment information
export const getAppointmentDetails = async (req, res) => {
    try {
        const { appointmentId } = req.body;

        // Find the appointment with doctor and patient details
        const appointment = await Appointment.findById(appointmentId)
            .populate("doctor", "name specialization email")
            .populate("patient", "name email");

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Format response
        const appointmentDetails = {
            doctorName: appointment.doctor.name,
            doctorSpecialization: appointment.doctor.specialization,
            doctorEmail: appointment.doctor.email,
            patientName: appointment.patient.name,
            patientEmail: appointment.patient.email,
            date: appointment.date,
            timeSlotStart: appointment.timeSlotStart,
            duration: appointment.duration,
            timeZone: appointment.timeZone,
            status: appointment.status,
            googleEventId: appointment.googleEventId || null,
        };

        res.status(200).json({
            message: "Appointment details fetched successfully",
            data: appointmentDetails,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching appointment details", error });
    }
};

export const addMedicalRecord = async (req, res) => {
    try {
        const doctorId = req.user.id; // Authenticated doctor
        const { appointmentId, description, fileUrl } = req.body;

        if (!appointmentId || !fileUrl) {
            return res.status(400).json({ message: "Appointment ID and file URL are required" });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Ensure the doctor is the one who attended the appointment
        if (appointment.doctor.toString() !== doctorId) {
            return res.status(403).json({ message: "You are not authorized to add a record for this appointment" });
        }

        const record = new MedicalRecord({
            appointment: appointment._id,
            patient: appointment.patient,
            doctor: appointment.doctor,
            description,
            fileUrl,
        });

        await record.save();

        res.status(201).json({
            message: "Medical record added successfully",
            data: record,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding medical record", error });
    }
};

// Utility function to check slot availability
const isSlotAvailable = (availableSlots, requestedStartTime, requestedEndTime) => {
    return availableSlots.some((slot) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        return requestedStartTime >= slotStart && requestedEndTime <= slotEnd;
    });
};

// Utility function to merge overlapping or adjacent slots
const mergeSlots = (slots) => {
    if (!slots || slots.length === 0) return [];

    const sorted = [...slots].sort((a, b) => new Date(a.start) - new Date(b.start));
    const merged = [];

    for (let i = 0; i < sorted.length; i++) {
        const currStart = new Date(sorted[i].start);
        const currEnd = new Date(sorted[i].end);

        if (
            merged.length > 0 &&
            new Date(merged[merged.length - 1].end) >= currStart
        ) {
            merged[merged.length - 1].end = new Date(
                Math.max(
                    new Date(merged[merged.length - 1].end),
                    currEnd
                )
            );
        } else {
            merged.push({
                start: new Date(currStart),
                end: new Date(currEnd),
            });
        }
    }

    return merged;
};