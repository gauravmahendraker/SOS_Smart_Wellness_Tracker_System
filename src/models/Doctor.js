import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    specialization: String,
    location: String,
    availableSlots: [String],
    paymentId: String,
});

export default mongoose.model("Doctor", DoctorSchema);
