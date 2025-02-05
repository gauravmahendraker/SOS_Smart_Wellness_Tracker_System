const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String },
});

module.exports = mongoose.model("Patient", PatientSchema);
