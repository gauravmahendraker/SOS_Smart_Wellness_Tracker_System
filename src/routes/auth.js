import express from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import { findOrCreateUser, generateToken } from "../utils/authUtils.js";

const router = express.Router();

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL; // Get the frontend URL from the environment variable

// Helper function to generate redirect URI
const getRedirectUri = (userType) => {
  return `${FRONTEND_URL}/auth/callback/${userType}`;
};

// Route for doctor's login
router.get("/login/doctor", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri("doctor") // Use the helper function to get the correct redirect URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/calendar",
    ],
  });

  res.json({ authUrl }); // Send OAuth URL to frontend
});

// Callback route for doctor's authentication
router.post("/auth/google/callback/doctor", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Authentication code is missing" });
  }
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri("doctor") // Ensure the correct redirect URI is set
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userProfile } = await oauth2.userinfo.get();
    const doctor = await findOrCreateUser(Doctor, userProfile, tokens.access_token, tokens.refresh_token);
    const token = generateToken({ id: doctor._id, role: 'doctor' });
    res.json({ token, user: doctor });
  } catch (error) {
    console.error("Error during Google authentication:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Route for patient's login
router.get("/login/patient", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri("patient") // Use the helper function to get the correct redirect URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/calendar", // Add calendar access for the patient
    ],
  });

  res.json({ authUrl });// Send OAuth URL to frontend
});

// Callback route for patient's authentication
router.post("/auth/google/callback/patient", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Authentication code is missing" });
  }
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri("patient") // Ensure the correct redirect URI is set
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userProfile } = await oauth2.userinfo.get();
    const patient = await findOrCreateUser(Patient, userProfile, tokens.access_token, tokens.refresh_token);
    const token = generateToken({ id: patient._id, role: 'patient' });
    res.json({ token, user: patient });
  } catch (error) {
    console.error("Error during Google authentication:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
