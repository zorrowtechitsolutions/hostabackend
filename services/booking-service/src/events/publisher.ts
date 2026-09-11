import amqp from 'amqplib';
import { env } from '../config/env';
import dotenv from "dotenv";
dotenv.config();

let channel: amqp.Channel;
let isConnecting = false;

export const connectRabbitMQ = async (retries = 3) => {
    if (isConnecting || channel) return;
    isConnecting = true;

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔌 Attempting to connect to RabbitMQ (Attempt ${i + 1}/${retries})...`);
            
            // Explicitly handle SSL for amqps://
            const connection = await amqp.connect(env.RABBITMQ_URL, {
                timeout: 10000,
            });
            
            connection.on("error", (err) => {
                console.error("RabbitMQ Connection Error:", err);
                channel = undefined as any;
            });

            connection.on("close", () => {
                console.log("RabbitMQ Connection Closed. Reconnecting...");
                channel = undefined as any;
                isConnecting = false;
                setTimeout(() => connectRabbitMQ(), 5000);
            });

            channel = await connection.createChannel();
            console.log('🐰 Booking Service connected to RabbitMQ');
            isConnecting = false;
            return;
        } catch (error) {
            console.error(`❌ RabbitMQ Connection Attempt ${i + 1} Failed:`, error);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, 3000));
            }
        }
    }
    isConnecting = false;
};

export const publishEvent = async (
  exchange: string,
  routingKey: string,
  data: any
) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    if (!channel) {
      console.warn(
        `⚠️ Cannot publish event '${routingKey}'. RabbitMQ channel not available.`
      );
      return;
    }

    await channel.assertExchange(exchange, "direct", { durable: true });
    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    console.log("📤 BOOKING EVENT PUBLISHED:", {
      event: routingKey,
      bookingId: data?.bookingId,
      hospitalId: data?.hospitalId,
      doctorId: data?.doctorId,
      userId: data?.userId,
    });

    // Socket.IO delivery is handled by notification-service after RabbitMQ consumption.
  } catch (error) {
    console.error("❌ Event Publish Error:", error);
  }
};
