import amqp from 'amqplib';
import { env } from '../config/env';
import axios from 'axios';

let channel: amqp.Channel;
let connection: any;

export const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(env.RABBITMQ_URL);

        connection.on('error', (err) => {
            console.error('❌ Blood Service RabbitMQ Connection Error:', err.message);
        });

        connection.on('close', (err) => {
            console.warn('⚠️ Blood Service RabbitMQ Connection closed. Retrying...');
            channel = null as any;
            setTimeout(connectRabbitMQ, 5000);
        });

        channel = await connection.createChannel();
        channel.on('error', (err) => {
            console.error('❌ Blood Service RabbitMQ Channel Error:', err.message);
        });
        console.log('🐰 Blood Service connected to RabbitMQ');
    } catch (error) {
        console.error('❌ Blood Service RabbitMQ Error:', error);
        setTimeout(connectRabbitMQ, 5000);
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

