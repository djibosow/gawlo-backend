const express = require("express");
const {
  registerUser,
  loginUserWithRole,
  verifyOTP,
  forgotPassword,
  resetPassword,
  updateUser,
  refreshAccessToken,
} = require("../controllers/userController");
const { verifyAccessToken } = require("../middleware/authMiddleware");
const User = require("../models/User"); // Ensure the User model is imported

const router = express.Router();

// User Registration and Authentication Routes
router.post("/register", registerUser); // Register a new user
router.post("/login", loginUserWithRole); // Login user with role
router.post("/verify-otp", verifyOTP); // Verify OTP for authentication
router.post("/forgot-password", forgotPassword); // Forgot password flow
router.post("/reset-password", resetPassword); // Reset password

// User Profile Management
router.put("/update/:id", verifyAccessToken, updateUser); // Update user details

// Refresh Token Route
router.post("/refresh-token", refreshAccessToken); // Refresh access token

// Logout Route
router.post("/logout", verifyAccessToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.refreshTokens = user.refreshTokens.filter(
      (token) => token !== req.body.token
    ); // Remove the token being logged out
    await user.save();
    res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    console.error("Error during logout:", error.message);
    res.status(500).json({ message: "Error during logout." });
  }
});

// Authenticated User Route
router.get("/me", verifyAccessToken, (req, res) => {
  try {
    res.status(200).json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    });
  } catch (error) {
    console.error("Error fetching user details:", error.message);
    res.status(500).json({ message: "Error fetching user details." });
  }
});

module.exports = router;
