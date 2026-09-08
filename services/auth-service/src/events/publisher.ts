import amqp from 'amqplib';
import { env } from '../config/env';

let channel: amqp.Channel;
let connection: any;

export const connectRabbitMQ = async () => {
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!connected && attempts < maxAttempts) {
        try {
            connection = await amqp.connect(env.RABBITMQ_URL || process.env.RABBITMQ_URL || "amqp://localhost");

            connection.on('error', (err: any) => {
                console.error('❌ Auth Service RabbitMQ Connection Error:', err);
            });

            connection.on('close', () => {
                console.warn('⚠️ Auth Service RabbitMQ Connection closed. Retrying...');
                channel = null as any;
                setTimeout(connectRabbitMQ, 5000);
            });

            channel = await connection.createChannel();
            console.log('🐰 Auth Service connected to RabbitMQ (Publisher)');
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
        console.log(`✅ Auth Service Published ${routingKey} to ${exchange}`);
    } catch (error) {
        console.error('❌ Event Publish Error:', error);
    }
};
