const express = require('express');
const mongoose = require('mongoose');
const nunjucks = require('nunjucks');
const session = require('express-session');
require('dotenv').config();

const User = require('./models/User');
const emailQueue = require('./lib/emailQueue');

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Nunjucks setup for views
nunjucks.configure('views', {
  autoescape: true,
  express: app,
});
app.set('view engine', 'html');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));


// Routes
// Route for the signup page
app.get("/", (req, res) => {
  res.render("signup");
});

// Handle form submission for signup
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const newUser = new User({
    email,
    password,
    verificationToken: otp,
    tokenExpiresAt: otpExpiresAt,
    emailVerified: false,
  });

  await newUser.save();

  // Store email in session to use later in OTP verification
  req.session.email = email;

  // Queue the email for sending
  await emailQueue.add({
    to: newUser.email,
    subject: "Verify Your Email",
    html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
  });

  res.render("otp", { message: "Please verify your email with the OTP sent to you." });
});

// Route for the OTP input page
app.get("/otp", (req, res) => {
  res.render("otp");
});

// Handle OTP verification
app.post("/verify-email", async (req, res) => {
  const { otp } = req.body;
  const email = req.session.email; // Retrieve email from session

  if (!email) {
    return res.render("otp", { error: "No email session found. Please sign up again." });
  }

  const user = await User.findOne({
    email,
    verificationToken: otp,
    tokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    return res.render("otp", { error: "Invalid or expired OTP" });
  }

  user.emailVerified = true;
  user.verificationToken = null;
  user.tokenExpiresAt = null;
  await user.save();

  // Clear the email from session after successful verification
  req.session.email = null;

  res.redirect("/dashboard");
});

// Dashboard route (after email is verified)
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});



// Start server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});