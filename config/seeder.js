const mongoose = require("mongoose");
require("dotenv").config();

const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Note = require("../models/Note");

const connectDB = require("./database");

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Note.deleteMany({});
    await User.deleteMany({});
    await Tenant.deleteMany({});

    console.log("Cleared existing data...");

    // Create Tenants
    const acmeTenant = await Tenant.create({
      name: "Acme Corporation",
      slug: "acme",
      subscription: {
        plan: "free",
      },
    });

    const globexTenant = await Tenant.create({
      name: "Globex Corporation",
      slug: "globex",
      subscription: {
        plan: "free",
      },
    });

    console.log("Created tenants...");

    // Create Users
    const users = await User.create([
      // Acme users
      {
        email: "admin@acme.test",
        password: "password",
        role: "admin",
        tenant: acmeTenant._id,
      },
      {
        email: "user@acme.test",
        password: "password",
        role: "member",
        tenant: acmeTenant._id,
      },
      // Globex users
      {
        email: "admin@globex.test",
        password: "password",
        role: "admin",
        tenant: globexTenant._id,
      },
      {
        email: "user@globex.test",
        password: "password",
        role: "member",
        tenant: globexTenant._id,
      },
    ]);

    console.log("Created users...");

    // Create some sample notes
    const sampleNotes = await Note.create([
      // Acme notes
      {
        title: "Welcome to Acme Notes",
        content:
          "This is your first note in the Acme tenant. You can create, edit, and delete notes here.",
        author: users[1]._id, // user@acme.test
        tenant: acmeTenant._id,
        tags: ["welcome", "sample"],
      },
      {
        title: "Meeting Notes - Q4 Planning",
        content:
          "Discussed quarterly goals and objectives for Q4. Key points: increase sales by 20%, launch new product line, improve customer satisfaction.",
        author: users[0]._id, // admin@acme.test
        tenant: acmeTenant._id,
        tags: ["meeting", "planning", "q4"],
      },
      // Globex notes
      {
        title: "Globex Project Ideas",
        content:
          "Brainstorming session results: 1. New manufacturing process, 2. Customer portal redesign, 3. Mobile app development",
        author: users[3]._id, // user@globex.test
        tenant: globexTenant._id,
        tags: ["brainstorming", "projects"],
      },
    ]);

    console.log("Created sample notes...");

    console.log("\n=== SEEDING COMPLETE ===");
    console.log("\nTest Accounts Created:");
    console.log("Acme Tenant:");
    console.log("  - admin@acme.test (Admin) - password: password");
    console.log("  - user@acme.test (Member) - password: password");
    console.log("\nGlobex Tenant:");
    console.log("  - admin@globex.test (Admin) - password: password");
    console.log("  - user@globex.test (Member) - password: password");
    console.log("\nBoth tenants start with FREE plan (3 notes max)");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    mongoose.disconnect();
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
