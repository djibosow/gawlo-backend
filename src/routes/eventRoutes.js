const express = require("express");
const Event = require("../models/Event");
const upload = require("../middleware/upload");
const { verifyAccessToken } = require("../middleware/authMiddleware");
const router = express.Router();
const { purchaseTickets } = require("../controllers/eventController"); // Adjust the path if needed

// Utility function to calculate specific date ranges
const calculateDateRange = (filter) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);

  switch (filter) {
    case "Aujourd'hui":
      end.setDate(start.getDate() + 1);
      break;
    case "Demain":
      start.setDate(start.getDate() + 1);
      end.setDate(start.getDate() + 1);
      break;
    case "Ce weekend":
      const day = start.getDay();
      const daysToFriday = day <= 5 ? 5 - day : 0;
      start.setDate(start.getDate() + daysToFriday);
      end.setDate(start.getDate() + 2);
      break;
    case "Cette semaine":
      const daysToSunday = 7 - start.getDay();
      end.setDate(start.getDate() + daysToSunday);
      break;
    case "Semaine prochaine":
      start.setDate(start.getDate() + (7 - start.getDay()));
      end.setDate(start.getDate() + 7);
      break;
    case "Weekend prochain":
      const nextWeekendStart = new Date(start);
      nextWeekendStart.setDate(start.getDate() + (7 - start.getDay()) + 5);
      start.setTime(nextWeekendStart.getTime());
      end.setDate(start.getDate() + 2);
      break;
    default:
      return null;
  }

  return { $gte: start, $lt: end };
};

// Route to fetch all events with filters and pagination
router.get("/", async (req, res) => {
  try {
    const {
      search,
      location,
      dateFilter,
      minPrice,
      maxPrice,
      subcategory,
      organizer,
      page = 1,
      limit = 40,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (location) query.location = location;

    if (dateFilter) {
      const dateRange = calculateDateRange(dateFilter);
      if (dateRange) query.date = dateRange;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (subcategory) query.subcategory = { $regex: subcategory, $options: "i" };
    if (organizer) query.organizer = organizer;

    const skip = (page - 1) * limit;
    const totalEvents = await Event.countDocuments(query);
    const events = await Event.find(query)
      .populate("organizer", "name email")
      .skip(skip)
      .limit(Number(limit));

    res.json({
      events,
      pagination: {
        totalEvents,
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des événements." });
  }
});

router.post("/purchaseTickets", (req, res, next) => {
  console.log("Request hit /purchaseTickets");
  next();
}, purchaseTickets);

// Route to create a new event
router.post("/", verifyAccessToken, upload.array("images", 5), async (req, res) => {
  try {
    const {
      title,
      category,
      subcategory,
      description,
      startDate,
      endDate,
      isFree,
      eventType,
      eventLink,
      location,
      city,
      address,
      tickets,
    } = req.body;

    if (!title || !category || !subcategory || !startDate || !endDate || !eventType) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    if (eventType === "Physical" && (!location || !city || !address)) {
      return res.status(400).json({
        message: "Les champs de localisation sont requis pour un événement physique.",
      });
    }

    if (eventType === "Online" && !eventLink) {
      return res.status(400).json({
        message: "Le lien de l'événement est requis pour un événement en ligne.",
      });
    }

    const parsedTickets = isFree === "false" && tickets ? JSON.parse(tickets) : [];
    const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);

    const event = new Event({
      title,
      category,
      subcategory,
      description,
      startDate,
      endDate,
      isFree: isFree === "true",
      eventType,
      eventLink: eventType === "Online" ? eventLink : null,
      location: eventType === "Physical" ? location : null,
      city: eventType === "Physical" ? city : null,
      address: eventType === "Physical" ? address : null,
      tickets: parsedTickets,
      images: imagePaths,
      organizer: req.user.id,
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'événement." });
  }
});

module.exports = router;
