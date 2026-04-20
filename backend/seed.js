// backend/seed.js
// Seed script - populates database with sample users, opportunities, and applications
// Data is auto-seeded on every server start (since we use in-memory DB)

const User = require('./models/User');
const Notification = require('./models/Notification');

async function seedDatabase() {
  try {
    // Check if data already exists
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seed] Database already has data, skipping seed.');
      return;
    }

    console.log('[Seed] Creating Super Admin...');

    // --- Create Users ---
    // All passwords: password123

    const admin = await User.create({
      username: 'admin',
      password: 'password123',
      email: 'admin@system.com',
      role: 'Admin',
      department: ''
    });

    await Notification.create({
      userId: admin._id,
      message: 'Welcome to the Multi-Tenant HR Platform! You are logged in as Super Admin. You can now create companies.'
    });

    console.log('[Seed] Database seeded successfully!');
    console.log('[Seed] Users: 1 Admin');

  } catch (err) {
    console.error('[Seed] Error:', err);
  }
}

module.exports = { seedDatabase };
