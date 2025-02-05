import express from "express";
import Doctor from "../models/Doctor.js"; // Adjust the path if needed

const doctorRouter = express.Router();

doctorRouter.put("/:email", async (req, res) => {
  const { email } = req.params; // Get email from URL params
  const updates = req.body; // Get updated fields from request body

  // Ensure email is not part of the updates
  if (updates.email) {
    return res.status(400).json({ message: "Email cannot be updated" });
  }

  try {
    // Find doctor by email and update other fields
    const updatedDoctor = await Doctor.findOneAndUpdate(
      { email }, // Filter by email
      { $set: updates }, // Apply updates
      { new: true, runValidators: true } // Return updated document and validate
    );

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({
      message: "Doctor updated successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating doctor", error: error.message });
  }
});


doctorRouter.get("/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const doctor = await Doctor.findOne({ email });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({ data: doctor });
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctor", error: error.message });
  }
});


doctorRouter.post("/", async (req, res) => {
  const { name, email, password, specialization, location, availableSlots, paymentId } = req.body;

  try {
    // Check if a doctor with the same email already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "A doctor with this email already exists" });
    }

    // Create a new doctor
    const newDoctor = new Doctor({
      name,
      email,
      password,
      specialization,
      location,
      availableSlots,
      paymentId,
    });

    await newDoctor.save();

    res.status(201).json({
      message: "Doctor created successfully",
      data: newDoctor,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating doctor", error: error.message });
  }
});


doctorRouter.delete("/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const deletedDoctor = await Doctor.findOneAndDelete({ email });

    if (!deletedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({
      message: "Doctor deleted successfully",
      data: deletedDoctor,
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting doctor", error: error.message });
  }
});

export default doctorRouter;
