const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("postgresql://hosta_user:Hosta%40123@35.174.10.32:5432/notifications_db", {
  dialect: "postgres",
  logging: true,
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log("Connected to the DB.");
    
    // Add the missing column
    await sequelize.query('ALTER TABLE notifications ADD COLUMN "bookingId" INTEGER;');
    console.log("Column bookingId added successfully.");
  } catch (error) {
    if (error.message.includes("already exists")) {
        console.log("Column bookingId already exists.");
    } else {
        console.error("Error modifying database:", error);
    }
  } finally {
    await sequelize.close();
  }
}

main();
