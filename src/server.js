require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { connectDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const eventRoutes = require("./routes/eventRoutes");
const refundRoutes = require("./routes/refundRoutes");
const logger = require("./utils/logger");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const mongoose = require("mongoose");

const app = express();

// Connect to Database
(async () => {
  try {
    await connectDB();
    logger.info("Connexion à la base de données réussie.");
  } catch (error) {
    logger.error("Échec de la connexion à la base de données:", error.message);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
})();

// Apply Helmet to secure HTTP headers
app.use(helmet());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests
  message: {
    message: "Trop de requêtes envoyées depuis cette IP. Veuillez réessayer plus tard.",
  },
});
app.use(limiter);

// Middleware for Dynamic CORS and JSON Parsing
const allowedOrigins = ["http://localhost:5173", "http://localhost:3000"]; // Add all allowed origins

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies and credentials
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // Allowed HTTP methods
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization", // Allowed headers
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Swagger Documentation Setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gawlo API",
      version: "1.0.0",
      description: "Documentation de l'API pour la plateforme Gawlo",
    },
  },
  apis: ["./routes/*.js"],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Debug: Verify route imports
console.log("User Routes:", userRoutes);
console.log("Event Routes:", eventRoutes);
console.log("Refund Routes:", refundRoutes);

// Register Routes
logger.info("Enregistrement des routes...");
app.use("/api/users", userRoutes); // Ensure userRoutes is exported correctly
app.use("/api/events", eventRoutes); // Ensure eventRoutes is exported correctly
app.use("/api/refunds", refundRoutes); // Ensure refundRoutes is exported correctly

// Base Route
app.get("/", (req, res) => res.send("L'API fonctionne..."));

// Health Check Endpoint
app.get("/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 1: connected, 0: disconnected
    res.json({
      server: "running",
      database: dbState === 1 ? "connected" : "disconnected",
    });
  } catch (error) {
    logger.error("Erreur lors de la vérification de l'état du serveur:", error.message);
    res.status(500).json({ server: "error", database: "error" });
  }
});

// 404 Error Middleware
app.use((req, res) => {
  logger.error(`Erreur 404 - Route non trouvée : ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route non trouvée" });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error("Erreur:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Erreur du serveur" });
});

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logger.info(`Serveur démarré sur le port ${PORT}`);
    logger.info(`Documentation disponible à l'adresse : http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;

