import amqp from 'amqplib';
import { env } from '../config/env';
import axios from 'axios';
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

    // IDs that should receive the event (prefixed to match frontend room names)
    const targetIds = [
      data?.userId ? `user_${data.userId}` : null,
      data?.hospitalId ? `hospital_${data.hospitalId}` : null,
      data?.doctorId ? `doctor_${data.doctorId}` : null,
      data?.staffId ? `staff_${data.staffId}` : null,
    ].filter((id): id is string => id !== null);

    const uniqueIds = Array.from(new Set(targetIds));

    if (uniqueIds.length > 0) {
      await Promise.allSettled(
        uniqueIds.map(async (id) => {
          try {
            await axios.post(
              `${process.env.SOCKETIO_SERVICE_URL}/emit-event`,
              {
                event: "booking_event",
                userId: id,
                data: {
                  event: routingKey,
                  data,
                },
              }
            );
            console.log(`📡 Socket event sent to ID: ${id}`);
          } catch (err: any) {
            console.error(
              `❌ Failed to emit event to ${id}:`,
              err.message
            );
          }
        })
      );
    } else {
      console.warn(`⚠️ No target IDs found for event ${routingKey}`);
    }
  } catch (error) {
    console.error("❌ Event Publish Error:", error);
  }
};
