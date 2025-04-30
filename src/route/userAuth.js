const express = require('express');
const { sendResponse } = require('../middleware/middleware');
const router = express.Router();
const bcrypt = require('bcrypt');
const { validate, registerSchema, loginSchema,forgotPasswordSchema } = require('../middleware/userAuthValidation')
const { generateTokens } = require('../utils/tokenUtils')
//const {forgotPasswordSchema}=require('../middleware/userAuthValidation')
const {sendMail}= require('../utils/nodeMailer');
const {verifyOtpSchema}=require('../middleware/userAuthValidation');
let users = [];
let refreshTokens = [];
let userOtps=[];

//registration
router.post('/register', validate(registerSchema), async (req, res) => {
    const { name, email, password, age } = req.body;

    const existing = users.find(u => u.email === email);
    if (existing) return sendResponse(res, 400, 'Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    //  console.log("hashedPassword",hashedPassword)
    const newUser = {
        id: users.length + 1,
        name,
        email,
        password: hashedPassword,
        age
    };

    users.push(newUser);
    const tokens = generateTokens(newUser);
    refreshTokens.push(tokens.refreshToken);

    return sendResponse(res, 201, 'User registered', { user: { id: newUser.id, email }, ...tokens });
});

//login
router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) return sendResponse(res, 401, 'Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendResponse(res, 401, 'Invalid credentials');

    const tokens = generateTokens(user);
    refreshTokens.push(tokens.refreshToken);

    return sendResponse(res, 200, 'Login successful', { user: { id: user.id, email }, ...tokens });
})
router.post('/sendEmailOtp', validate(forgotPasswordSchema), async (req, res) => {
    const { email } = req.body;
 
    const user = users.find(u => u.email === email);
    if (!user) return sendResponse(res, 404, 'User not found');
 
    try {
        const otp = Math.floor(100000 + Math.random() * 900000);
        const expireAt = Date.now() + 60 * 1000; // expires in 1 minute
 
        const existingOtpEntry = userOtps.find(entry => entry.email === email);
 
        if (existingOtpEntry) {
            existingOtpEntry.otp = otp;
            existingOtpEntry.expireAt = expireAt;
        } else {
            userOtps.push({ email, otp, expireAt });
        }
 
        const message = `
            <p>Dear User,</p>
            <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
            <p>Please use it within 1 minute to verify your email and complete the password reset process.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <br />
            <p>Best regards,<br />Batch$ Team<br /><a href="https://example.com">https://example.com</a></p>
        `;
 
        // Mock or real email sending function
     await sendMail(email, "OTP Verification Code - Batch4", message);
 
        return sendResponse(res, 200, 'OTP created. Please check your email.', { otp });
    } catch (error) {
        return sendResponse(res, 500, error.message);
    }
});
// Verify OTP
router.post('/verify-otp',validate(verifyOtpSchema), async (req, res) => {
    const { email, otp } = req.body;
 
    if (!email || !otp) {
        return sendResponse(res, 400, 'Email and OTP are required');
    }
 
    const otpEntry = userOtps.find(entry => entry.email === email);
 
    if (!otpEntry) {
        return sendResponse(res, 404, 'OTP not found. Please request a new one.');
    }
 
    const isExpired = Date.now() > otpEntry.expireAt;
 
    if (isExpired) {
        // Optionally remove expired OTPs
        userOtps = userOtps.filter(entry => entry.email !== email);
        return sendResponse(res, 410, 'OTP has expired. Please request a new one.');
    }
 
    if (otpEntry.otp.toString() !== otp.toString()) {
        return sendResponse(res, 401, 'Invalid OTP');
    }
 
    // OTP is valid – remove from store
    userOtps = userOtps.filter(entry => entry.email !== email);
 
    return sendResponse(res, 200, 'OTP verified successfully');
});
 

module.exports = router 