import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema({
    googleId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String},
    phone: { type: String },
    appointmentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }],  //reference of all appointments of patients
    accessToken: { type: String }, 
    refreshToken: { type: String }, 
});

export default mongoose.model("Patient", PatientSchema);
