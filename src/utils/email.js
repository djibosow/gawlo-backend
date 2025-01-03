const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Fonction pour envoyer un email générique
const sendEmail = async (to, subject, html) => {
  try {
    if (!to || !subject || !html) {
      throw new Error("Les paramètres 'to', 'subject' ou 'html' sont manquants.");
    }

    const msg = {
      to, // Adresse e-mail du destinataire
      from: process.env.FROM_EMAIL, // Adresse e-mail vérifiée de l'expéditeur
      subject, // Sujet de l'e-mail
      html, // Contenu HTML de l'e-mail
    };

    // Log the email details for debugging purposes
    console.log("Préparation de l'envoi de l'email : ", msg);

    // Send the email
    await sgMail.send(msg);
    console.log(`Email envoyé à ${to}`);
  } catch (error) {
    console.error(
      "Erreur lors de l'envoi de l'email :",
      error.response?.body?.errors || error.message
    );

    // Re-throw the error for higher-level handling
    throw new Error("Erreur lors de l'envoi de l'email.");
  }
};

// Fonction pour envoyer un email OTP
const sendOTPEmail = async (email, otp) => {
  try {
    if (!email || !otp) {
      throw new Error("Les paramètres 'email' ou 'otp' sont manquants.");
    }

    const subject = "Connexion à votre compte Gawlo";
    const html = `
      <p>Bonjour,</p>
      <p>Votre code OTP est : <strong>${otp}</strong></p>
      <p>Ce code est valable pendant 10 minutes.</p>
    `;

    // Call the sendEmail function to send the OTP email
    await sendEmail(email, subject, html);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email OTP :", error.message);

    // Re-throw the error for higher-level handling
    throw new Error("Erreur lors de l'envoi de l'email OTP.");
  }
};

module.exports = { sendEmail, sendOTPEmail };
