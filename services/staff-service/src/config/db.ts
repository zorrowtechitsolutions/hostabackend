









import { Sequelize } from "sequelize";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

const useSSL = env.DATABASE_URL.includes("neon.tech");

const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",

  logging: !isProduction,

  dialectOptions: useSSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},

  // pool: {
  //   max: 10,
  //   min: 2,
  //   acquire: 30000,
  //   idle: 10000,
  // },
   pool: {
  max: 5,
  min: 0,
  acquire: 30000,
  idle: 10000,
  evict: 1000,
},
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();

    console.log("✅ PostgreSQL Connected (staff Service)");

  } catch (error) {
    console.error("❌ DB Error:", error);
    process.exit(1);
  }
};

export default sequelize;