
import amqp from 'amqplib';
import { env } from '../config/env';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

let channel: amqp.Channel;

// export const connectRabbitMQ = async () => {
//     let connected = false;
//     let attempts = 0;
//     const maxAttempts = 5;

//     while (!connected && attempts < maxAttempts) {
//         try {
//             const connection = await amqp.connect(env.RABBITMQ_URL);
            
//             connection.on('error', (err) => {
//                 console.error('❌ Hospital Service RabbitMQ Connection Error:', err);
//             });

//             connection.on('close', () => {
//                 console.warn('⚠️ Hospital Service RabbitMQ Connection closed. Retrying...');
//                 channel = null as any;
//                 setTimeout(connectRabbitMQ, 5000);
//             });

//             channel = await connection.createChannel();
//             console.log('🐰 Hospital Service connected to RabbitMQ');
//             connected = true;
//         } catch (error) {
//             attempts++;
//             console.error(`❌ RabbitMQ Connection attempt ${attempts} failed:`, error instanceof Error ? error.message : error);
//             if (attempts < maxAttempts) {
//                 console.log("Retrying in 5 seconds...");
//                 await new Promise((resolve) => setTimeout(resolve, 5000));
//             } else {
//                 console.error("Max RabbitMQ connection attempts reached.");
//             }
//         }
//     }
// };
export const connectRabbitMQ = async () => {
    while (true) {
        try {
            const connection = await amqp.connect(env.RABBITMQ_URL);

            connection.on("error", (err) => {
                console.error("❌ Hospital Service RabbitMQ Connection Error:", err);
            });

            connection.on("close", () => {
                console.warn("⚠️ Hospital Service RabbitMQ Connection closed. Reconnecting...");
                channel = null as any;

                setTimeout(() => {
                    connectRabbitMQ();
                }, 5000);
            });

            channel = await connection.createChannel();

            console.log("🐰 Hospital Service connected to RabbitMQ");

            break; // Connected successfully
        } catch (error) {
            console.error(
                "❌ RabbitMQ Connection failed:",
                error instanceof Error ? error.message : error
            );

            console.log("Retrying in 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
};
export const publishEvent = async (exchange: string, routingKey: string, data: any) => {
    try {
        if (!channel) {
            await connectRabbitMQ();
        }
        await channel.assertExchange(exchange, 'direct', { durable: true });
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), { persistent: true });

            await axios.post(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
            event: routingKey,
            userId : null,
            data
        });

    } catch (error) {
        console.error('❌ Event Publish Error:', error);
    }
};
