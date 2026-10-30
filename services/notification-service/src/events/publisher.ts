
import amqp from 'amqplib';
import { env } from '../config/env';
import axios from 'axios';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log('🐰 Notification Service connected to RabbitMQ');
    } catch (error) {
        console.error('❌ RabbitMQ Error:', error);
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
                if (data?.createdBy) {
                    targetRooms.push(`staff_${data.createdBy}`);
                    targetRooms.push(`user_${data.createdBy}`);
                }
                if (data?.userId) targetRooms.push(`user_${data.userId}`);

                await axios.post(`${process.env.SOCKETIO_SERVICE_URL}/emit-event`, {
                    event: exchange === "email_events" ? "email_event" : routingKey,
                    rooms: targetRooms.length > 0 ? targetRooms : undefined,
                    userId: data?.userId || data?.hospitalId,
                    data: exchange === "email_events" ? {
                        event: "EMAIL_QUEUED",
                        message: `Email "${data.subject}" queued`,
                        data
                    } : data
                }, { timeout: 3000 });
            } catch (err: any) {
                console.warn(`⚠️ Failed to emit socket event via axios: ${err.message}`);
            }
        }
        

    } catch (error) {
        console.error('❌ Event Publish Error:', error);
    }
};
