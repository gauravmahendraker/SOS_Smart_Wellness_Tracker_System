import express from "express";
import passport from '../config/passport.js';
const router = express.Router();

router.get('/login/doctor', passport.authenticate('google-doctor', {scope:['profile','email']}));
router.get(                             //passport.js redirects to below url after authentication
    '/auth/google/callback/doctor', 
    passport.authenticate('google-doctor', { failureRedirect: '/login?error=doctor_auth_failed' }),
    (req, res) => {
      res.redirect('/dashboard/doctor');
    }
);

router.get('/login/patient', passport.authenticate('google-patient', { scope: ['profile', 'email'] }));
router.get(
    '/auth/google/callback/patient', 
    passport.authenticate('google-patient', { failureRedirect: '/login?error=patient_auth_failed' }),
    (req, res) => {
      res.redirect('/dashboard/patient');
    }
);

export default router;