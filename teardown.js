const mongoose = require("mongoose");
const cleanupDatabase = require("./src/utils/cleanup");

module.exports = async () => {
  // Clean up the database
  await cleanupDatabase();

  // Close the database connection
  await mongoose.disconnect();
};
