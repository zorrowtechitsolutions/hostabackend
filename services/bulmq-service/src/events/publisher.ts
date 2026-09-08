
import amqp from 'amqplib';
import { env } from '../config/env';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log('🐰 Bulmq Service connected to RabbitMQ');
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
        console.log(`📤 Published event '${routingKey}' to exchange '${exchange}'`);
    } catch (error) {
        console.error('❌ Event Publish Error:', error);
    }
};
