import express from "express";
import {
  createDoctor,
  searchDoctors,
  updateDoctorDetails,
  getMyProfile,
} from "../controllers/doctorController.js";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";

const doctorRouter = express.Router();

// Routes with controller functions
doctorRouter.post("/", ensureAuthenticated, ensureRole('doctor'), createDoctor);
doctorRouter.get("/", ensureAuthenticated, ensureRole('any'), searchDoctors);
doctorRouter.get("/me", ensureAuthenticated, ensureRole('doctor'), getMyProfile);
doctorRouter.put("/:email", ensureAuthenticated, ensureRole('doctor'), updateDoctorDetails);

export default doctorRouter;
