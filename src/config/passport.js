import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { google } from 'googleapis';


const findOrCreateUser =  async( Model, userProfile ) => {
  let user = await Model.findOne({ googleId: userProfile.id });
  if( !user ){
    user = await Model.create({
            googleId: userProfile.id,
            email: userProfile.emails[0].value,
            name: userProfile.displayName
    })
  }
  return user;
}

passport.use('google-doctor', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback/doctor'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const doctor = await findOrCreateUser( Doctor, profile);
        return done(null, {...doctor.toObject(), role:'doctor' });
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
        const patient = await findOrCreateUser( Patient, profile);
        return done(null, {...patient.toObject(), role:'patient' });
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, {id: user._id, role: user.role}  );
});

passport.deserializeUser(async (obj, done) => {
  try {
    // Here you can fetch user by id from the database
    console.log("Deserializing user:", obj); 
    let user = obj.role === 'doctor' ? await Doctor.findById(obj.id) : await Patient.findById(obj.id);
    done(null, user ? { ...user.toObject(), role: obj.role } : null);
  } catch (err) {
    done(err, null);
  }
});



export default passport;
