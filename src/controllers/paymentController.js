import { razorpayInstance } from "../config/razorpay.js";
import { Appointment } from "../models/export.js";
import mongoose from "mongoose";
import crypto from "crypto";

export const createOrder = async (req, res) => {
    try {
        const { appointmentId } = req.body;

        if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: "Invalid appointment ID." });
        }

        const appointment = await Appointment.findById(appointmentId).populate("doctor");

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        if (appointment.isPaid) {
            return res.status(400).json({ message: "Appointment is already paid." });
        }

        // For now, hardcoding a price — in a real system, this could be dynamic
        const amountInRupees = 500; // fallback if no fee
        const amountInPaise = amountInRupees * 100;

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_${appointmentId}`,
        };

        const order = await razorpayInstance.orders.create(options);
        console.log("create Order completed");
        return res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                appointmentId,
            },
        });
    } catch (error) {
        console.error("Error in createOrder:", error);
        return res.status(500).json({ message: "Failed to create payment order." });
    }
};


export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            appointmentId,
        } = req.body;

        // Generate expected signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid signature. Payment failed." });
        }

        // Signature verified — update appointment
        await Appointment.findByIdAndUpdate(appointmentId, { isPaid: true });
        console.log("verify payment completed");
        return res.status(200).json({ success: true, message: "Payment verified." });
    } catch (err) {
        console.error("Payment verification failed:", err);
        res.status(500).json({ message: "Server error during verification." });
    }
};
