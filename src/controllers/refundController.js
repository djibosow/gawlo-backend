const Refund = require("../models/Refund");
const Event = require("../models/Event");
const User = require("../models/User");
const { sendEmail } = require("../utils/email");
const logger = require("../utils/logger");

const submitRefundRequest = async (req, res) => {
  const { userId, eventId, quantity, ticketType } = req.body;

  try {
    logger.info("Processing refund request submission...");
    const user = await User.findById(userId);
    const event = await Event.findById(eventId);

    if (!user || !event) {
      logger.warn("User or event not found during refund request submission.");
      return res.status(404).json({ message: "Utilisateur ou événement introuvable." });
    }

    const ticket = event.tickets.find((t) => t.type === ticketType);
    if (!ticket) {
      logger.warn("Ticket type not found for refund.");
      return res.status(400).json({ message: "Type de billet introuvable." });
    }

    const existingRefunds = await Refund.find({
      user: userId,
      event: eventId,
      ticketType,
    });

    const totalRefundedQuantity = existingRefunds.reduce((sum, refund) => sum + refund.quantity, 0);

    if (quantity > ticket.sold - totalRefundedQuantity) {
      logger.warn("Refund request exceeds ticket purchase quantity.");
      return res.status(400).json({
        message: `Vous ne pouvez demander un remboursement que pour un maximum de ${ticket.sold - totalRefundedQuantity} billet(s).`,
      });
    }

    const refund = new Refund({
      user: userId,
      event: eventId,
      quantity,
      ticketType,
      status: "Pending",
    });

    await refund.save();

    logger.info("Refund request submitted successfully.");
    res.status(201).json({ message: "Demande de remboursement soumise avec succès." });
  } catch (error) {
    logger.error("Error during refund request submission:", error.message);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

  const approveRefund = async (req, res) => {
    const { id } = req.params; // Refund ID
    const { status } = req.body; // New refund status
  
    try {
      logger.info(`Processing refund approval for ID: ${id}`);
      console.log(`Refund ID: ${id}, New Status: ${status}`);
  
      const refund = await Refund.findById(id).populate("user event");
      console.log("Fetched Refund:", refund); // Debug refund details
  
      if (!refund) {
        logger.warn(`Refund request with ID ${id} not found.`);
        return res.status(404).json({ message: "Demande de remboursement introuvable." });
      }
  
      refund.status = status;
      await refund.save();
  
      if (status === "Approved") {
        logger.info("Refund approved. Updating event ticket information...");
        const event = await Event.findById(refund.event._id);
        const ticket = event.tickets.find((t) => t.type === refund.ticketType);
  
        if (ticket) {
          ticket.sold -= refund.quantity;
          event.ticketsAvailable += refund.quantity;
          await event.save();
        } else {
          logger.error(`Ticket type ${refund.ticketType} not found for event ID: ${refund.event._id}`);
        }
      }
  
      // Prepare email details
      const subject = status === "Approved"
        ? "Votre demande de remboursement a été approuvée"
        : "Votre demande de remboursement a été rejetée";
  
      const html = status === "Approved"
        ? `<p>Bonjour ${refund.user.name},</p>
           <p>Votre demande de remboursement pour l'événement <strong>${refund.event.title}</strong> a été approuvée.</p>
           <p>Quantité remboursée : ${refund.quantity} billet(s).</p>`
        : `<p>Bonjour ${refund.user.name},</p>
           <p>Votre demande de remboursement pour l'événement <strong>${refund.event.title}</strong> a été rejetée.</p>`;
  
      // Debug email data
      console.log("Email Details:");
      console.log("To:", refund.user.email);
      console.log("Subject:", subject);
      console.log("HTML Content:", html);
  
      // Send email
      try {
        await sendEmail(refund.user.email, subject, html);
        logger.info(`Email sent successfully to ${refund.user.email}`);
      } catch (emailError) {
        logger.error("Error sending email:", emailError.message);
        return res.status(500).json({
          message: `Remboursement ${status} avec succès, mais l'email n'a pas pu être envoyé.`,
        });
      }
  
      logger.info(`Refund ${status} processed successfully.`);
      res.status(200).json({ message: `Remboursement ${status} avec succès.` });
    } catch (error) {
      logger.error("Error during refund approval processing:", error.message);
      console.error("Erreur lors du traitement du remboursement :", error.message);
      res.status(500).json({
        message: "Une erreur s'est produite lors du traitement du remboursement.",
        error: error.message,
      });
    }
  };  

  // Fetch all refund requests with optional filters
const getAllRefunds = async (req, res) => {
    const { status, eventId, userId, page = 1, limit = 10 } = req.query;
  
    try {
      const filters = {};
      if (status) filters.status = status;
      if (eventId) filters.event = eventId;
      if (userId) filters.user = userId;
  
      const refunds = await Refund.find(filters)
        .populate("user", "name email")
        .populate("event", "title startDate")
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
  
      const total = await Refund.countDocuments(filters);
  
      res.json({
        refunds,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error("Error fetching refunds:", error.message);
      res.status(500).json({
        message: "Erreur lors de la récupération des remboursements.",
        error: error.message,
      });
    }
  };

module.exports = {
  submitRefundRequest,
  approveRefund,  getAllRefunds,
};

