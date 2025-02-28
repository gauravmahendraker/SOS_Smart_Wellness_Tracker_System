# SOS_Smart_Wellness_Tracker_System

This project is a **SOS_Smart_Wellness_Tracker_System** that utilizes Google Calendar for scheduling.

## Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:
   ```env
   MONGO_URI=
   SESSION_SECRET=
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   # GOOGLE_REDIRECT_URI_DOCTOR=http://localhost:5000/auth/google/callback/doctor
   # GOOGLE_REDIRECT_URI_PATIENT=http://localhost:5000/auth/google/callback/patient
   GOOGLE_REDIRECT_URI_DOCTOR=http://localhost:5000/dashboard/doctor
   GOOGLE_REDIRECT_URI_PATIENT=http://localhost:5000/dashboard/patient
   JWT_SECRET=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   CLOUDINARY_NAME=
   ```

4. Start the server:
   ```sh
   npm run dev
   ```

## Features
- Google OAuth authentication for doctors and patients.
- Google Calendar integration for managing appointments.
- JWT-based authentication.
- Profile editing for doctors.
- Search functionality for doctors by specialization.

## Folder Structure
```
📁 project-root
│-- 📁 config          # Configuration files (passport.js, db.js, etc.)
│-- 📁 models          # Mongoose models (Doctor.js, Patient.js)
│-- 📁 routes          # Express route handlers
│-- 📁 controllers     # Business logic
│-- 📁 middleware      # Authentication & security middleware
│-- 📁 utils           # Utility functions
│-- 📁 public          # Static assets
│-- 📁 views           # Frontend templates (if applicable)
│-- 📄 server.js       # Main server file
│-- 📄 package.json    # Dependencies and scripts
│-- 📄 .env            # Environment variables (not committed)
```  

## API Endpoints

### Authentication
- **`GET /auth/google/login/doctor`** – Redirects to Google OAuth for doctor login.
- **`GET /auth/google/callback/doctor`** – Google OAuth callback for doctors.
- **`GET /auth/google/login/patient`** – Redirects to Google OAuth for patient login.
- **`GET /auth/google/callback/patient`** – Google OAuth callback for patients.

### Doctors
- **`GET /doctors`** – Get list of doctors.
- **`GET /doctors/:id`** – Get a doctor by ID.
- **`PUT /doctors/:id`** – Edit doctor profile.

### Patients
- **`GET /patients/:id`** – Get a patient by ID.

### Appointments
- **`POST /appointments`** – Book an appointment.
- **`GET /appointments/:id`** – Get an appointment by ID.

## License
MIT License
Course project for Service Oriented Systems
