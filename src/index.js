import 'dotenv/config';
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
const app = express();
import session from 'express-session';
import passport from './config/passport.js';
import router from './routes/globalRouter.js';

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

//Global Router to avoid multiple routes in index.js
app.use('/', router);

app.get("/", (req, res) => res.send("API is running"));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));