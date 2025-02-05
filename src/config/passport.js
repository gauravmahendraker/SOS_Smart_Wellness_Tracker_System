const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Doctor = require("../models/Doctor"); // or your User model if combining both roles

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

module.exports = passport;
