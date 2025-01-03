const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: false, unique: true }, // Optionnel
    password: { type: String, required: true },
    roles: [{ type: String }],
    refreshTokens: [
      {
        token: { type: String },
        _id: false, // Évite de créer un _id supplémentaire pour chaque sous-document
      },
    ],
    otp: { type: String }, // Champ OTP
    otpExpiry: { type: Date }, // Expiration OTP
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
