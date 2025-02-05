import express from 'express';
import doctorRouter from './doctorRouter.js';
import patientRouter from './patientRouter.js';
import appointmentRouter from './appointmentRouter.js';
import authRoutes from './auth.js';

const router = express.Router();

router.use('/doctor', doctorRouter);
router.use('/patient', patientRouter);
router.use('/appointment', appointmentRouter);
router.use('/', authRoutes);

export default router;
