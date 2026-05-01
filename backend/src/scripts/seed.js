require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/User");

const run = async () => {
  await connectDB();

  const email = process.env.SEED_OWNER_EMAIL || "owner@example.com";
  const exists = await User.findOne({ email });

  if (exists) {
    console.log(`Owner already exists: ${email}`);
    process.exit(0);
  }

  const owner = new User({
    name: process.env.SEED_OWNER_NAME || "Owner",
    email,
    role: "owner",
    active: true
  });

  await owner.setPassword(process.env.SEED_OWNER_PASSWORD || "owner12345");
  await owner.save();

  console.log(`Seeded owner user: ${email}`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

