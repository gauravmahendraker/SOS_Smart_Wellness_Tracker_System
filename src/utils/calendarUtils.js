import { google } from "googleapis";

export const refreshAccessToken = async (refreshToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const tokens = await oauth2Client.getAccessToken();
  return tokens.token; //new access token
};

export const createGoogleCalendarEvent = async (
  doctor,
  patient,
  appointment
) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  doctor.accessToken = await refreshAccessToken(doctor.refreshToken);
  doctor.save();
  oauth2Client.setCredentials({
    access_token: doctor.accessToken,
    refresh_token: doctor.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const event = {
    summary: `Appointment with ${patient.name}`,
    start: {
      dateTime: appointment.timeSlotStart,
      timeZone: appointment.timeZone,
    },
    end: {
      dateTime: new Date(
        new Date(appointment.timeSlotStart).getTime() +
          appointment.duration * 60000
      ),
      timeZone: appointment.timeZone,
    },
    attendees: [{ email: patient.email }],
    transparency: "opaque",
  };
  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });

  return response.data.id;
};
