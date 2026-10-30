import amqp from 'amqplib';
import { env } from '../config/env';
import axios from 'axios';
import dotenv from "dotenv";
dotenv.config();

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!connected && attempts < maxAttempts) {
        try {
            const connection = await amqp.connect(env.RABBITMQ_URL);
            
            connection.on('error', (err) => {
                console.error('❌ User Service RabbitMQ Connection Error:', err);
            });

            connection.on('close', () => {
                console.warn('⚠️ User Service RabbitMQ Connection closed. Retrying...');
                channel = null as any;
                setTimeout(connectRabbitMQ, 5000);
            });

            channel = await connection.createChannel();
            console.log('🐰 User Service connected to RabbitMQ');
            connected = true;
        } catch (error) {
            attempts++;
            console.error(`❌ RabbitMQ Connection attempt ${attempts} failed:`, error instanceof Error ? error.message : error);
            if (attempts < maxAttempts) {
                console.log("Retrying in 5 seconds...");
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
                console.error("Max RabbitMQ connection attempts reached.");
            }
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

        if (process.env.SOCKETIO_SERVICE_URL) {
            try {
                const targetRooms: string[] = [];
                if (data?.hospitalId) targetRooms.push(`hospital_${data.hospitalId}`);
                if (data?.userId) targetRooms.push(`user_${data.userId}`);

                if (exchange === "patient_events") {
                    const patientPayload = {
                        event: routingKey,
                        message: `Patient ${routingKey.toLowerCase().replace("patient_", "")}`,
                        data
                    };

                    // Emit patient_event (for frontend patient listeners)
                    await axios.post(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
                        event: "patient_event",
                        rooms: targetRooms,
                        data: patientPayload
                    }, { timeout: 3000 });

                    // Emit hospital_event (for general hospital notification feed)
                    await axios.post(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
                        event: "hospital_event",
                        rooms: targetRooms,
                        data: patientPayload
                    }, { timeout: 3000 });

                    // Emit emergency_alert (for real-time toast/alert UI)
                    await axios.post(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
                        event: "emergency_alert",
                        rooms: targetRooms,
                        data: patientPayload
                    }, { timeout: 3000 });
                } else {
                    await axios.post(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
                        event: routingKey,
                        rooms: targetRooms.length > 0 ? targetRooms : undefined,
                        userId: data?.userId,
                        data
                    }, {
                        timeout: 3000,
                    });
                }
            } catch (socketErr: any) {
                // Log non-blocking socket error
                console.warn(`⚠️ Failed to emit socket event via axios: ${socketErr.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Event Publish Error:', error);
    }
};
