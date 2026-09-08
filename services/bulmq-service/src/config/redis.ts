import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();


export const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null
});




async function testRedis() {
  try {
    await connection.set("test_key", "hello");
    const value = await connection.get("test_key");

    console.log("Redis working ✔️ Value =", value);
  } catch (err) {
    console.error("Redis NOT working ❌", err);
  }
}

testRedis();