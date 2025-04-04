import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    date: { type: Date, required: true, index: true }, // Stored in UTC
    timeSlotStart: { type: Date, required: true, index: true }, // Stored in UTC
    duration: { type: Number, required: true }, // Duration in minutes
    timeZone: { type: String, required: true, default: "UTC" }, // Stored for reference
    status: {
        type: String,
        enum: ["confirmed", "canceled", "completed"],
        default: "confirmed",
    },
    // paymentStatus:{} to add
    googleEventId: { type: String, unique: true }, // Google Calendar event ID
});

// Convert `timeSlotStart` to UTC before saving
AppointmentSchema.pre("save", function (next) {
    this.date = new Date(this.date).toISOString();
    this.timeSlotStart = new Date(this.timeSlotStart).toISOString();
    next();
});

export default mongoose.model("Appointment", AppointmentSchema);
