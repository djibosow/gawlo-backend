const mongoose = require("mongoose");

const cleanupDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    console.log("Database cleanup successful.");
  } catch (error) {
    console.error("Error during database cleanup:", error.message);
  }
};

module.exports = cleanupDatabase;
