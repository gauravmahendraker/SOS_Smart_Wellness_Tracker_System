import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient"},
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    description: { type: String },
    fileUrl: { type: String },
    date: { type: Date, default: Date.now }
});

export default mongoose.model("MedicalRecord", medicalRecordSchema);
