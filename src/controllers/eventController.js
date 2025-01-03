const User = require("../models/User");
const Event = require("../models/Event");
const sgMail = require("@sendgrid/mail");

// Set up SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Helper Function: Send Email
const sendEmail = async (to, subject, html) => {
    const msg = {
      to,
      from: process.env.FROM_EMAIL, // Replace with your verified sender email
      subject,
      html,
    };
  
    try {
      await sgMail.send(msg);
      console.log(`Email envoyé à ${to}`);
    } catch (error) {
      console.error(
        `Erreur d'envoi de l'email à ${to}:`,
        error.response?.body?.errors || error.message
      );
      throw new Error("Erreur lors de l'envoi de l'email.");
    }
  };

// Purchase Tickets Controller
const purchaseTickets = async (req, res) => {
    const { userId, eventId, ticketQuantity, ticketType } = req.body;
  
    try {
      const user = await User.findById(userId);
      const event = await Event.findById(eventId);
  
      if (!user || !event) {
        return res.status(404).json({ message: "Utilisateur ou événement introuvable." });
      }
  
      const selectedTicket = event.tickets.find(
        (ticket) => ticket.type === ticketType
      );
  
      if (!selectedTicket) {
        return res
          .status(400)
          .json({ message: "Le type de billet sélectionné n'est pas disponible." });
      }
  
      if (selectedTicket.quantity - selectedTicket.sold < ticketQuantity) {
        return res
          .status(400)
          .json({ message: "Pas assez de billets disponibles." });
      }
  
      // Deduct tickets from the available pool
      selectedTicket.sold += ticketQuantity;
  
      await event.save();
  
      // Send confirmation email in French
      const subject = "Confirmation d'achat de billets";
      const html = `
        <p>Bonjour ${user.name},</p>
        <p>Merci d'avoir acheté des billets pour l'événement : <strong>${event.title}</strong>.</p>
        <p>Détails :</p>
        <ul>
          <li><strong>Date :</strong> ${event.startDate.toLocaleDateString("fr-FR")}</li>
          <li><strong>Lieu :</strong> ${event.location}</li>
          <li><strong>Type de billet :</strong> ${ticketType}</li>
          <li><strong>Quantité :</strong> ${ticketQuantity}</li>
        </ul>
        <p>Nous espérons que vous profiterez pleinement de l'événement !</p>
      `;
  
      await sendEmail(user.email, subject, html);
  
      res.status(200).json({
        message: "Billets achetés avec succès.",
        event: {
          id: event._id,
          title: event.title,
          ticketsRemaining: selectedTicket.quantity - selectedTicket.sold,
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'achat des billets :", error.message);
      res.status(500).json({
        message: "Une erreur s'est produite lors de l'achat des billets.",
        error: error.message,
      });
    }
  };
  
  module.exports = {
    purchaseTickets,
  };