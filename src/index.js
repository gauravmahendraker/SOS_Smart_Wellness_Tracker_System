import 'dotenv/config';
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { doctorRouter, patientRouter, appointmentRouter } from './routes/export.js';
const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("API is running"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.use('/doctor', doctorRouter)
app.use('/patient', patientRouter)
app.use('/appointment', appointmentRouter)

