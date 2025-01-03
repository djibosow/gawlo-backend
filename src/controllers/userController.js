const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Event = require("../models/Event"); // Import Event model
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Helper Functions
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

const generateRefreshToken = (user) => {
  const duration = user.roles.includes("admin") || user.roles.includes("organizer")
    ? "7d" // 7 days for admins/organizers
    : "30d"; // 30 days for regular users
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: duration,
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL, // Verified sender email
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(
      `Error sending email to ${to}:`,
      error.response?.body?.errors || error.message
    );
    throw new Error("Erreur lors de l'envoi de l'email.");
  }
};

// Helper Function to Validate Email Format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Register User
const registerUser = async (req, res) => {
  const { name, email, phone, password, initialRole } = req.body;

  try {
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "L'adresse email est invalide.",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit comporter au moins 8 caractères, inclure une lettre majuscule, une lettre minuscule, un chiffre, et un caractère spécial.",
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        message: "Un utilisateur avec cet e-mail ou numéro de téléphone existe déjà.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      roles: [initialRole],
    });

    await user.save();
    res.status(201).json({ message: "Utilisateur enregistré avec succès." });
  } catch (error) {
    console.error("Error in registerUser:", error.message);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement de l'utilisateur.",
      error: error.message,
    });
  }
};

// Login User with Role Validation
const loginUserWithRole = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "L'adresse email est invalide." });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Email ou mot de passe invalide." });
    }

    if (!user.roles.includes(role)) {
      return res.status(403).json({
        message: `L'utilisateur n'est pas enregistré en tant que ${role}.`,
      });
    }

    if (role === "organizer") {
      const otp = generateOTP();
      user.set({
        otp: otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });
      await user.save({ validateModifiedOnly: true });

      const subject = "Connexion à votre compte Gawlo en tant qu'organisateur";
      const html = `
        <p>Bonjour,</p>
        <p>Votre code OTP est : <strong>${otp}</strong></p>
        <p>Ce code est valable pendant 10 minutes.</p>`;
      await sendEmail(user.email, subject, html);

      return res.status(200).json({
        message: "Code OTP envoyé par email. Veuillez vérifier votre boîte de réception.",
        role: "organizer",
      });
    }

    if (role === "buyer") {
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens.push({ token: refreshToken });
      await user.save();

      return res.status(200).json({
        message: "Connexion réussie en tant qu'acheteur.",
        role: "buyer",
        accessToken,
        refreshToken,
      });
    }

    return res.status(403).json({
      message: "Rôle utilisateur non pris en charge.",
    });
  } catch (error) {
    console.error("Error in loginUserWithRole:", error.message);
    res.status(500).json({
      message: "Erreur lors de la connexion.",
      error: error.message,
    });
  }
};

// Verify OTP for organizers
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Code OTP invalide ou mal formaté." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Utilisateur introuvable." });
    }

    // Log details for debugging
    console.log(`Provided OTP: ${otp}`);
    console.log(`Stored OTP: ${user.otp}`);
    console.log(`OTP Expiry: ${user.otpExpiry}`);

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Code OTP invalide." });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Code OTP expiré." });
    }

    // Clear OTP and expiry after successful verification
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error("Error in verifyOTP:", error.message);
    res.status(500).json({ message: "Erreur lors de la vérification de l'OTP.", error });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1-hour expiry
    await user.save();

    const subject = "Réinitialisation de mot de passe";
    const html = `<p>Bonjour,</p>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetLink}">${resetLink}</a>`;
    await sendEmail(user.email, subject, html);

    res.json({ message: "Lien de réinitialisation du mot de passe envoyé par email." });
  } catch (error) {
    console.error("Error in forgotPassword:", error.message);
    res.status(500).json({ message: "Erreur lors de l'envoi de l'email de réinitialisation.", error });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Le token de réinitialisation est invalide ou expiré." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W_]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit comporter au moins 8 caractères, inclure une lettre majuscule, une lettre minuscule, un chiffre, et un caractère spécial.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Error in resetPassword:", error.message);
    res.status(500).json({
      message: "Erreur lors de la réinitialisation du mot de passe.",
      error: error.message,
    });
  }
};

// Update User
const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    res.json(user);
  } catch (error) {
    console.error("Error in updateUser:", error.message);
    res.status(500).json({
      message: "Erreur lors de la mise à jour de l'utilisateur.",
      error: error.message,
    });
  }
};

// Refresh Access Token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Generate a new access token
    const accessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      accessToken,
      message: "Access token refreshed successfully.",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Refresh token has expired." });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid refresh token." });
    } else {
      return res.status(500).json({ message: "Error refreshing token." });
    }
  }
};

// New Function: Ticket Purchase Confirmation Email
const sendPurchaseConfirmationEmail = async (user, ticketDetails) => {
  const html = `
    <p>Bonjour <strong>${user.name}</strong>,</p>
    <p>Merci d'avoir acheté des billets pour l'événement suivant :</p>
    <ul>
      <li><strong>Événement :</strong> ${ticketDetails.eventName}</li>
      <li><strong>Date :</strong> ${ticketDetails.eventDate}</li>
      <li><strong>Heure :</strong> ${ticketDetails.eventTime}</li>
      <li><strong>Nombre de billets :</strong> ${ticketDetails.ticketQuantity}</li>
    </ul>
    <p>Nous vous remercions pour votre confiance !</p>
  `;

  await sendEmail(user.email, "Confirmation d'achat de billet", html);
};

// Updated Ticket Purchase Endpoint
const purchaseTickets = async (req, res) => {
  const { userId, eventId, ticketQuantity } = req.body;

  try {
    // Fetch user and event details
    const user = await User.findById(userId);
    const event = await Event.findById(eventId); // Fetch event details from database

    if (!user || !event) {
      return res.status(404).json({ message: "Utilisateur ou événement introuvable." });
    }

    // Log ticket purchase
    console.log(`Purchased ${ticketQuantity} tickets for ${event.name}`);

    // Send confirmation email
    const ticketDetails = {
      eventName: event.name,
      eventDate: event.date,
      eventTime: event.time,
      ticketQuantity,
    };

    try {
      await sendPurchaseConfirmationEmail(user, ticketDetails);
    } catch (error) {
      console.error("Error sending purchase confirmation email:", error.message);
      return res.status(500).json({
        message: "Achat réussi, mais l'email de confirmation n'a pas pu être envoyé.",
      });
    }

    res.status(200).json({ message: "Achat de billets réussi et email envoyé." });
  } catch (error) {
    console.error("Error in purchaseTickets:", error.message);
    res.status(500).json({ message: "Erreur lors de l'achat de billets.", error: error.message });
  }
};

// Add to module.exports
module.exports = {
  registerUser,
  loginUserWithRole,
  verifyOTP,
  forgotPassword,
  resetPassword,
  updateUser,
  purchaseTickets,
  refreshAccessToken, // Add this export
};