import { Patient } from "../models/export.js";

// Create a new patient
export const createPatient = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // Check if a patient with the same email already exists
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) {
            return res.status(400).json({ message: "A patient with this email already exists" });
        }

        // Create a new patient
        const newPatient = new Patient({ name, email, password, phone });
        await newPatient.save();

        res.status(201).json({
            message: "Patient created successfully",
            data: newPatient,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating patient", error: error.message });
    }
};

// Get a patient by email
export const getPatientByEmail = async (req, res) => {
    const { email } = req.params;

    try {
        const patient = await Patient.findOne({ email });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({ data: patient });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching patient", error: error.message });
    }
};

// Update a patient's details
export const updatePatientDetails = async (req, res) => {
    const { email } = req.params;
    const updates = req.body;

    // Ensure email is not updated
    if (updates.email) {
        return res.status(400).json({ message: "Email cannot be updated" });
    }

    try {
        const updatedPatient = await Patient.findOneAndUpdate(
            { email }, // Filter by email
            { $set: updates }, // Apply updates
            { new: true, runValidators: true } // Return updated document and validate schema
        );

        if (!updatedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({
            message: "Patient updated successfully",
            data: updatedPatient,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating patient", error: error.message });
    }
};

// Delete a patient by email
export const deletePatient = async (req, res) => {
    const { email } = req.params;

    try {
        const deletedPatient = await Patient.findOneAndDelete({ email });

        if (!deletedPatient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.status(200).json({
            message: "Patient deleted successfully",
            data: deletedPatient,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting patient", error: error.message });
    }
};

export const getMyProfile = async (req, res) =>{
    try{
        if(req.user){
            const user = req.user;
            // console.log(user);
            const patient = await Patient.findById(user.id)
                            .populate({
                                path: 'appointmentHistory',
                                populate : {
                                    path : 'doctor',
                                }
                            });
            if(!patient){
                return res.status(404).json({message:'User Not found '});
            }
            return res.status(200).json({
                data : patient
            });
        }
        else{
            return res.status(404).json({message:'User not Logged in'});
        }
    
    }
    catch ( error ){
        console.error('Error fetching patient:', error);
        return res.status(500).json({
                                        message :'Error fetching Patient',
                                        error   :error.message
                                    });
    }
};
