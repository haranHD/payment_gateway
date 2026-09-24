const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();
const Payment = require("./models/Payment");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

//this is for creating payment order (STEP : 1)
app.post("/create-order", async (req, res) => {

    try {

        const options = {
            amount: 50000,
            currency: "INR",
            receipt: "receipt_001"
        };

        const order = await razorpay.orders.create(options);

        console.log("Razorpay Order:");
        console.log(order);

        res.json(order);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to create order"
        });
    }

});

//STEP : 3 (Verification)
app.post("/verify-payment", async (req, res) => {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                razorpay_order_id + "|" + razorpay_payment_id
            )
            .digest("hex");

        if (generatedSignature === razorpay_signature) {

            console.log("Payment signature verified successfully!");

            const payment = new Payment({
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                amount: 50000,
                currency: "INR",
                status: "SUCCESS"
            });

            await payment.save();

            console.log("Payment saved to MongoDB!");

            return res.json({
                success: true,
                message: "Payment verified and saved successfully"
            });
        }

        console.log("Payment signature verification failed!");

        return res.status(400).json({
            success: false,
            message: "Invalid payment signature"
        });

    } catch (error) {

        console.error("Verification error:", error);

        res.status(500).json({
            success: false,
            message: "Payment verification failed"
        });
    }
});

//STEP : 5 (DB storing info of the payment)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });

//STEP : 6 (Webhook server to server)
app.post("/webhook", (req, res) => {

    console.log("Webhook received!");

    console.log(req.body);

    res.json({
        success: true
    });
});
app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});