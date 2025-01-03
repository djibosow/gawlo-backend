const mongoose = require("mongoose");
const cleanupDatabase = require("./src/utils/cleanup");

module.exports = async () => {
  // Connect to the database
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  // Clean up the database
  await cleanupDatabase();
};
