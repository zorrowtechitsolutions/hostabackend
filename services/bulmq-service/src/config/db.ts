// services/bulmq-service/src/config/db.ts

// Bulmq service does not require a database connection (uses Redis and RabbitMQ).
// Kept for consistency if connectDB is referenced.
export const connectDB = async (): Promise<void> => {
  console.log("ℹ️ Database connection skipped for Bulmq Service");
};

export default null;
