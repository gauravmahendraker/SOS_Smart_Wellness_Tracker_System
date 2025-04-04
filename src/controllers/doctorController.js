import { Doctor } from "../models/export.js";
import moment from "moment-timezone";

// Utility function to convert available slots to UTC
const convertSlotsToUTC = (availableSlots, timeZone) => {
    return availableSlots.map((slot) => ({
        start: moment.tz(slot.start, timeZone).utc().toDate(),
        end: moment.tz(slot.end, timeZone).utc().toDate(),
    }));
};

// Create a new doctor
export const createDoctor = async (req, res) => {
    const { name, email, password, specialization, location, availableSlots, timeZone, paymentId } = req.body;

    try {
        const existingDoctor = await Doctor.findOne({ email });
        if (existingDoctor) {
            return res.status(400).json({ message: "A doctor with this email already exists" });
        }

        // Convert slots to UTC
        const convertedSlots = convertSlotsToUTC(availableSlots, timeZone);

        const newDoctor = new Doctor({
            name,
            email,
            password,
            specialization,
            location,
            availableSlots: convertedSlots,
            timeZone,
            paymentId,
        });

        await newDoctor.save();
        res.status(201).json({ message: "Doctor created successfully", data: newDoctor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating doctor", error });
    }
};

// Update doctor details
export const updateDoctorDetails = async (req, res) => {
    const { email } = req.params;
    let updates = req.body;

    if (updates.email) {
        return res.status(400).json({ message: "Email cannot be updated" });
    }

    try {
        if (updates.availableSlots && updates.timeZone) {
            updates.availableSlots = convertSlotsToUTC(updates.availableSlots, updates.timeZone);
        }

        const updatedDoctor = await Doctor.findOneAndUpdate(
            { email },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedDoctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        res.status(200).json({ message: "Doctor updated successfully", data: updatedDoctor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating doctor", error: error.message });
    }
};


export const searchDoctors = async (req, res) => {
    try {
        const { name, specialization, location } = req.query;

        // Build the search query
        let query = {};
        if (name) {
            query.name = { $regex: name, $options: "i" }; // Case-insensitive partial match
        }
        if (specialization) {
            query.specialization = specialization; // Exact match
        }
        if (location) {
            query.location = { $regex: location, $options: "i" }; // Case-insensitive match
        }

        // Fetch doctors matching the query
        const doctors = await Doctor.find(query).select("-password"); // Exclude password from response

        if (doctors.length === 0) {
            return res.status(404).json({ message: "No doctors found matching the criteria" });
        }

        res.status(200).json({ message: "Doctors found", data: doctors });
    } catch (error) {
        console.error("Error searching doctors:", error);
        res.status(500).json({ message: "Error searching doctors", error: error.message });
    }
};

export const getMyProfile = async (req, res) => {
    try {
        if (req.user) {
            const user = req.user;

            const doctor = await Doctor.findById(user.id).select('-password');

            if (!doctor) {
                return res.status(404).json({ message: 'Doctor not found' });
            }

            return res.status(200).json({
                data: doctor
            });
        } else {
            return res.status(401).json({ message: 'User not logged in' });
        }
    } catch (error) {
        console.error('Error fetching doctor:', error);
        return res.status(500).json({
            message: 'Error fetching doctor',
            error: error.message
        });
    }
};