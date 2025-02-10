import { Router } from "express";
import {
    createPatient,
    getPatientByEmail,
    updatePatientDetails,
    deletePatient,
} from "../controllers/patientController.js";
import { ensureAuthenticated, ensureRole } from "../middlewares/authMiddleware.js";

const patientRouter = Router();

// Define routes
patientRouter.post("/", createPatient);
patientRouter.get("/:email", ensureAuthenticated, ensureRole('patient'), getPatientByEmail);
patientRouter.put("/:email", ensureAuthenticated, ensureRole('patient'), updatePatientDetails);
patientRouter.delete("/:email", ensureAuthenticated, ensureRole('patient'), deletePatient);

export default patientRouter;
