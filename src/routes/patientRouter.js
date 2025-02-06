import { Router } from "express";
import {
    createPatient,
    getPatientByEmail,
    updatePatientDetails,
    deletePatient,
} from "../controllers/patientController.js";

const patientRouter = Router();

// Define routes
patientRouter.post("/", createPatient);
patientRouter.get("/:email", getPatientByEmail);
patientRouter.put("/:email", updatePatientDetails);
patientRouter.delete("/:email", deletePatient);

export default patientRouter;
