import express from "express";
import {
  createDoctor,
  updateDoctorDetails,
} from "../controllers/doctorController.js";

const doctorRouter = express.Router();

// Routes with controller functions
doctorRouter.post("/", createDoctor);
doctorRouter.put("/:email", updateDoctorDetails);

export default doctorRouter;
