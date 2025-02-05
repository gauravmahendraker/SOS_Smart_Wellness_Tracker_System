import express from "express";
import { Doctor } from "../models/export.js";
import moment from "moment-timezone";

const doctorRouter = express.Router();

// Convert available slots to UTC
const convertSlotsToUTC = (availableSlots, timeZone) => {
  return availableSlots.map(slot => ({
    start: moment.tz(slot.start, timeZone).utc().toDate(),
    end: moment.tz(slot.end, timeZone).utc().toDate()
  }));
};

doctorRouter.post("/", async (req, res) => {
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
});


// Update doctor details
doctorRouter.put("/:email", async (req, res) => {
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
    res.status(500).json({ message: "Error updating doctor", error: error.message });
  }
});

export default doctorRouter;
