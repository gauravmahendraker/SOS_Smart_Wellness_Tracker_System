import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';


// For doctors
passport.use('google-doctor', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback/doctor'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let doctor = await Doctor.findOne({ googleId: profile.id });
        if (!doctor) {
            doctor = await Doctor.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName
            });
        }
        return done(null, doctor);
    } catch (error) {
        return done(error, null);
    }
}));

// For patients
passport.use('google-patient', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback/patient'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let patient = await Patient.findOne({ googleId: profile.id });
        if (!patient) {
            patient = await Patient.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName
            });
        }
        return done(null, patient);
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Here you can fetch user by id from the database
    const user = await Doctor.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await Doctor.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = await Doctor.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            // For OAuth users, you might not have a password
            password: null,
            // You can optionally set defaults for other fields
            phone: null
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
