import express from "express";
import { Doctor, Patient, Appointment } from "../models/export.js";
import moment from "moment-timezone";

const appointmentRouter = express.Router();

// Check availability for a doctor on a specific date
appointmentRouter.post("/check-availability", async (req, res) => {
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

        // Get booked appointments
        const appointments = await Appointment.find({
            doctor,
            timeSlotStart: { $gte: dayStartUTC, $lt: dayEndUTC },
        });

        // Remove booked slots
        let updatedAvailableSlots = [...availableSlotsForDate];
        for (const appointment of appointments) {
            const appointmentStartTime = new Date(appointment.timeSlotStart);
            const appointmentEndTime = new Date(appointmentStartTime.getTime() + appointment.duration * 60000);

            updatedAvailableSlots = updatedAvailableSlots.flatMap((slot) => {
                const slotStartTime = new Date(slot.start);
                const slotEndTime = new Date(slot.end);

                if (appointmentStartTime < slotEndTime && appointmentEndTime > slotStartTime) {
                    const newSlots = [];
                    if (slotStartTime < appointmentStartTime) {
                        newSlots.push({ start: slotStartTime, end: appointmentStartTime });
                    }
                    if (slotEndTime > appointmentEndTime) {
                        newSlots.push({ start: appointmentEndTime, end: slotEndTime });
                    }
                    return newSlots;
                }

                return [slot];
            });
        }

        // Convert available slots to requested time zone for display
        const formattedSlots = updatedAvailableSlots.map((slot) => ({
            start: moment.utc(slot.start).tz(timeZone).format(),
            end: moment.utc(slot.end).tz(timeZone).format(),
        }));

        res.status(200).json({ message: "Available slots fetched successfully", data: formattedSlots });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error checking availability", error });
    }
});

// Define isSlotAvailable function
const isSlotAvailable = (availableSlots, requestedStartTime, requestedEndTime) => {
    return availableSlots.some((slot) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        return requestedStartTime >= slotStart && requestedEndTime <= slotEnd;
    });
};

appointmentRouter.post("/book", async (req, res) => {
    const { doctor, patient, date, timeSlotStart, duration, timeZone } = req.body;

    try {
        const doctorExists = await Doctor.findById(doctor);
        if (!doctorExists) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Convert requested times to UTC
        const requestedStartTime = moment.tz(timeSlotStart, timeZone).utc().toDate();
        const requestedEndTime = moment(requestedStartTime).add(duration, "minutes").toDate();
        console.log("Doctor's Available Slots (UTC):", doctor.availableSlots);

        console.log("Requested Start Time (UTC):", requestedStartTime);
        console.log("Requested End Time (UTC):", requestedEndTime);
        console.log("Doctor Available Slots (UTC):", doctorExists.availableSlots);

        // Validate availability
        if (!isSlotAvailable(doctorExists.availableSlots, requestedStartTime, requestedEndTime)) {
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

        await doctorExists.save();

        // Create and save appointment
        const appointment = new Appointment({
            doctor,
            patient,
            date: moment.tz(date, timeZone).utc().toDate(),
            timeSlotStart: requestedStartTime,
            duration,
            timeZone,
            status: "confirmed",
        });

        await appointment.save();

        res.status(201).json({ message: "Appointment booked successfully", data: appointment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error booking appointment", error });
    }
});

appointmentRouter.post("/cancel", async (req, res) => {
    const { appointmentId } = req.body;

    try {
        // Find the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if the appointment is already canceled
        if (appointment.status === "canceled") {
            return res.status(400).json({ message: "Appointment is already canceled" });
        }

        // Update the appointment status to "canceled"
        appointment.status = "canceled";
        await appointment.save();

        // Find the doctor and re-add the canceled time slot
        const doctor = await Doctor.findById(appointment.doctor);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        const canceledSlotStart = new Date(appointment.timeSlotStart);
        const canceledSlotEnd = new Date(canceledSlotStart.getTime() + appointment.duration * 60000);

        // Add the canceled slot back to available slots
        doctor.availableSlots.push({ start: canceledSlotStart, end: canceledSlotEnd });

        // Merge overlapping slots
        doctor.availableSlots = mergeSlots(doctor.availableSlots);

        await doctor.save();

        res.status(200).json({
            message: "Appointment canceled successfully and slot re-added to availability",
            data: { appointment, updatedSlots: doctor.availableSlots },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error canceling appointment", error });
    }
});

// Function to merge overlapping or adjacent slots
const mergeSlots = (slots) => {
    if (!slots || slots.length === 0) return [];

    // Sort slots by start time
    slots.sort((a, b) => new Date(a.start) - new Date(b.start));

    const mergedSlots = [slots[0]];

    for (let i = 1; i < slots.length; i++) {
        const lastMergedSlot = mergedSlots[mergedSlots.length - 1];
        const currentSlot = slots[i];

        if (new Date(lastMergedSlot.end) >= new Date(currentSlot.start)) {
            // Merge overlapping or adjacent slots
            lastMergedSlot.end = new Date(
                Math.max(new Date(lastMergedSlot.end).getTime(), new Date(currentSlot.end).getTime())
            );
        } else {
            // Add non-overlapping slot as a new entry
            mergedSlots.push(currentSlot);
        }
    }

    return mergedSlots;
};

export default appointmentRouter;
