import { Router } from "express";
import Patient from "../models/Patient.js"; // Adjust the path if necessary

const patientRouter = Router();

patientRouter.post("/", async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // Check if a patient with the same email already exists
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) {
            return res.status(400).json({ message: "A patient with this email already exists" });
        }

        // Create a new patient
        const newPatient = new Patient({ name, email, password, phone });
        await newPatient.save();

        res.status(201).json({
            message: "Patient created successfully",
            data: newPatient,
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating patient", error: error.message });
    }
});


patientRouter.get("/:email", async (req, res) => {
    const { email } = req.params;

    try {
        const patient = await Patient.findOne({ email });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({ data: patient });
    } catch (error) {
        res.status(500).json({ message: "Error fetching patient", error: error.message });
    }
});


patientRouter.put("/:email", async (req, res) => {
    const { email } = req.params;
    const updates = req.body;

    // Ensure email is not updated
    if (updates.email) {
        return res.status(400).json({ message: "Email cannot be updated" });
    }

    try {
        const updatedPatient = await Patient.findOneAndUpdate(
            { email }, // Filter by email
            { $set: updates }, // Apply updates
            { new: true, runValidators: true } // Return updated document and validate schema
        );

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({
            message: "Patient updated successfully",
            data: updatedPatient,
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating patient", error: error.message });
    }
});


patientRouter.delete("/:email", async (req, res) => {
    const { email } = req.params;

    try {
        const deletedPatient = await Patient.findOneAndDelete({ email });

        if (!deletedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({
            message: "Patient deleted successfully",
            data: deletedPatient,
        });
    } catch (error) {
        res.status(500).json({ message: "Error deleting patient", error: error.message });
    }
});

export default patientRouter;
