// import { Sequelize } from "sequelize";

// import { env } from "./env";

// const sequelize = new Sequelize(env.DATABASE_URL, {
//   dialect: "postgres",
//   logging: env.NODE_ENV === "development" ? console.log : false,
//   dialectOptions: {
//     ssl: {
//       require: true,
//       rejectUnauthorized: false,
//     },
//   },
// });

// export const connectDB = async () => {
//   try {
//     await sequelize.authenticate();

//     console.log("✅ PostgreSQL Connected (Booking Service)");

//   } catch (error) {
//     console.error("❌ DB Error:", error);
//     process.exit(1);
//   }
// };

// export default sequelize;

import { Sequelize } from "sequelize";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",

  logging: !isProduction,

  dialectOptions: isProduction
    ? {
      ssl: {
        require: true,
        rejectUnauthorized: true, // ✅ secure
      },
    }
    : {},

  pool: {
    max: 10,        // ✅ better for production
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL Connected (Ambulance Service)");

    // ✅ PRODUCTION: Use migrations instead of sync
    // In development, you can still use sync for convenience
    if (isProduction) {
      console.log("⚠️  Production mode: Ensure migrations are run via 'npm run migrate'");
      // Do NOT use sync in production - migrations should be run separately
    } else {
      await sequelize.sync({ alter: true }); // dev — alters columns to match model
      console.log("🚀 Database schema synchronized (dev mode)");
    }

  } catch (error) {
    console.error("❌ DB Error:", error);
    process.exit(1);
  }
};

export default sequelize;




