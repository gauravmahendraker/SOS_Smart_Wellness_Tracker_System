import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema({
    googleId: { type: String, unique: true },
    name: String,
    email: { type: String, unique: true },
    password: String,
    specialization: String,
    location: String,
    calendarLink: { type: String },  
    accessToken: { type: String }, 
    refreshToken: { type: String }, 
    availableSlots: [
        {
            start: { type: Date, required: true, index: true },  // Always stored in UTC
            end: { type: Date, required: true, index: true },    // Always stored in UTC
        },
    ],
    timeZone: { type: String, required: true, default: "UTC" }, // Stored for reference
    paymentId: String,
});

// Ensure all dates are stored in UTC
DoctorSchema.pre("save", function (next) {
    this.availableSlots = this.availableSlots.map(slot => ({
        start: new Date(slot.start).toISOString(),
        end: new Date(slot.end).toISOString(),
    }));
    next();
});

export default mongoose.model("Doctor", DoctorSchema);
