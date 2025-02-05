import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import Doctor from "../models/Doctor.js"; // Ensure the file extension is included

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
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
            password: null,
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
