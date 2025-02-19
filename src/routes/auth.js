import express from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";

const router = express.Router();


const findOrCreateUser = async (
  Model,
  userProfile,
  accessToken,
  refreshToken
) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  let calendarLink = "";
  try {
    const { data } = await calendar.calendarList.get({ calendarId: "primary" });
    calendarLink = data.id
      ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(data.id)}`
      : "";
  } catch (error) {
    console.error("Error fetching Google Calendar link:", error);
  }

  let user = await Model.findOne({ googleId: userProfile.id });

  if (!user) {
    user = await Model.create({
      googleId: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      accessToken: accessToken,
      refreshToken: refreshToken || "",
      calendarLink: calendarLink,
    });
  } else {
    user.accessToken = accessToken;
    if (refreshToken) {
      user.refreshToken = refreshToken;
    }
    if (calendarLink) {
      user.calendarLink = calendarLink;
    }
    await user.save();
  }

  return user;
};

// prompt: 'consent'

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

router.get("/login/doctor", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_DOCTOR // Should point to frontend
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });

  res.json({ authUrl }); // Send OAuth URL to frontend
});

//when user is authenticated from google and redirected to frontend the frontend posts the code to callback to exchnage it with jwt tokens
router.post("/auth/google/callback/doctor", async (req, res) => {
  const {code} = req.body;
  console.log(code)
  if (!code) {
    return res.status(400).json({ error: " Authentication code is missing " });
  }
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI_DOCTOR
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

router.get("/login/patient", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_PATIENT // Should point to frontend
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["profile", "email"],
  });

  res.json({ authUrl }); // Send OAuth URL to frontend
});

router.post("/auth/google/callback/patient", async (req, res) => {
  const {code} = req.body;
  if (!code) {
    return res.status(400).json({ error: " Authentication code is missing " });
  }
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI_PATIENT
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



//JSON method to send post request of code from frontend to callback
// const exchangeAuthCode = async (code) => {
//   try {
//     const response = await fetch("http://your-backend-url/auth/google/callback/doctor", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ code }),
//     });
//     const data = await response.json();
//     console.log(data); // Contains JWT and user info
//   } catch (error) {
//     console.error("Error exchanging auth code:", error);
//   }
// };


export default router;
