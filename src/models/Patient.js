import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String },
});

export default mongoose.model("Patient", PatientSchema);
