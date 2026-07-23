const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const isDocker = process.env.IS_DOCKER === "true" || process.env.DOCKER_ENV === "true";
    let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/InstaClone";

    // If running in Docker and mongoUri points to local 127.0.0.1/localhost, adapt to container 'mongodb'
    if (isDocker && mongoUri.includes("127.0.0.1")) {
      mongoUri = mongoUri.replace("127.0.0.1", "mongodb");
    } else if (isDocker && mongoUri.includes("localhost")) {
      mongoUri = mongoUri.replace("localhost", "mongodb");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected successfully");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err.message);
  }
};

module.exports = connectDB;
