
import jwt from "jsonwebtoken";
import { google } from "googleapis";


export const findOrCreateUser = async (
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
  
export const generateToken = (user) => {
  // console.log(user.id);
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );
  };
  