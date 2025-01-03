const mongoose = require("mongoose");

// Debug: Check the logger path
console.log("Logger path:", require.resolve("../utils/logger"));

const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      logger.info("Attempting to connect to MongoDB...");
      console.log("Connecting to MongoDB using URI:", process.env.MONGO_URI); // Debug log
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info("MongoDB Connected successfully.");
    } else {
      logger.info("MongoDB already connected.");
      console.log("MongoDB connection state:", mongoose.connection.readyState); // Debug log
    }
  } catch (err) {
    logger.error("Error connecting to MongoDB:", err.message);
    console.log("Error details:", err); // Debug log for detailed error
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      logger.info("Disconnecting from MongoDB...");
      console.log("Disconnecting MongoDB connection."); // Debug log
      await mongoose.connection.close();
      logger.info("MongoDB disconnected.");
    } else {
      logger.info("MongoDB was already disconnected.");
    }
  } catch (err) {
    logger.error("Error disconnecting from MongoDB:", err.message);
    console.log("Error details while disconnecting:", err); // Debug log
  }
};

module.exports = { connectDB, disconnectDB };

