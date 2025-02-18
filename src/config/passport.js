import passport from 'passport';
import {
  Strategy as GoogleStrategy
} from 'passport-google-oauth20';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import {
  google
} from 'googleapis';


//Issues were scope was to be specified
//Refresh token served only during the initial authentication
//calendar api was disabled
// Access Token was getting expired
//in google calendar had to pass a oauthClient with accessToken instead of accessToken
//Login Required was due to expired accessToken which needed refreshToken to refresh 
// which inturn was return only during first authentication so had to store in databse

const refreshAccessToken_f = async (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    refresh_token: user.refreshToken, 
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  user.accessToken = credentials.access_token;
  if (credentials.refresh_token) {
    user.refreshToken = credentials.refresh_token;
  }
  await user.save();  
};

const expiredToken = async (accessToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken
  });

  try {

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client
    });
    await calendar.calendarList.list(); 
    return false; 
  } catch (error) {
    if (error.code === 401) {
      
      return true;
    }
    throw error; 
  }
};


const refreshAccessToken = async (refreshToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const tokens = await oauth2Client.getAccessToken();
  return tokens.token; //new access token
}

const findOrCreateUser = async (Model, userProfile, accessToken, refreshToken) => {
  let user = await Model.findOne({
    googleId: userProfile.id
  });
  console.log(refreshToken);
  if (!user) {
    let validAccessToken = accessToken;
    const isExpired = await expiredToken(validAccessToken);
    if (isExpired) {
      console.log('Access token expired, refreshing...');
      validAccessToken = await refreshAccessToken(refreshToken);
      console.log('New access token:', validAccessToken);
    } else {
      console.log('Access token is valid');
    }

    //creating oauthClient to get google Calendar
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: validAccessToken
    });
    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client,
    });
    let calendarLink = '';
    try {
      const res = await calendar.calendarList.list();
      console.log(res);
      if (res.data.items.length > 0) {
        calendarLink = res.data.items[0].id;
      }
    } catch (error) {
      console.log('Error fetching calendar: ', error);
    }

    user = await Model.create({
      googleId: userProfile.id,
      email: userProfile.emails[0].value,
      name: userProfile.displayName,
      calendarLink: calendarLink,
      accessToken: accessToken,
      refreshToken: refreshToken,
    })
  }
  return user;
}

passport.use('google-doctor', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback/doctor',
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
  // accessType: 'offline',
  // prompt: 'consent',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log("refreshToken: ", refreshToken);
    const doctor = await findOrCreateUser(Doctor, profile, accessToken, refreshToken);
    if(refreshToken){
      doctor.refreshToken = refreshToken;
    }  
    await refreshAccessToken_f(doctor);
    return done(null, {
      ...doctor.toObject(),
      role: 'doctor'
    });
  } catch (error) {
    return done(error, null);
  }
}));

// For patients
passport.use('google-patient', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback/patient',
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const patient = await findOrCreateUser(Patient, profile, accessToken, refreshToken);
    if(refreshToken){
      patient.refreshToken = refreshToken;
    }  
    await refreshAccessToken_f(patient);
    return done(null, {
      ...patient.toObject(),
      role: 'patient'
    });
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, {
    id: user._id,
    role: user.role
  });
});

passport.deserializeUser(async (obj, done) => {
  try {
    // Here you can fetch user by id from the database
    console.log("Deserializing user:", obj);
    let user = obj.role === 'doctor' ? await Doctor.findById(obj.id) : await Patient.findById(obj.id);
    done(null, user ? {
      ...user.toObject(),
      role: obj.role
    } : null);
  } catch (err) {
    done(err, null);
  }
});


export default passport;