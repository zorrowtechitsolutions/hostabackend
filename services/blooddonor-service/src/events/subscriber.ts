import amqp from 'amqplib';
import { env } from '../config/env';
import BloodDonor from '../models/bloodDonor.model';

export const startSubscriber = async () => {
    try {
        const connection = await amqp.connect(env.RABBITMQ_URL);
        let channel = await connection.createChannel();
        const exchange = 'user_events';
        
        await channel.assertExchange(exchange, 'direct', { durable: true });
        
        const queue = 'blood_service_user_events_queue';
        const dlxExchange = 'blood_service_dlx';
        const dlqQueue = 'blood_service_dlq';
        const retryQueue = 'blood_service_retry_queue';

        // ── 1. SETUP DEAD LETTER EXCHANGE & QUEUE ──
        await channel.assertExchange(dlxExchange, 'direct', { durable: true });
        await channel.assertQueue(dlqQueue, { durable: true });
        await channel.bindQueue(dlqQueue, dlxExchange, 'failed');

        // ── 2. SETUP RETRY QUEUE ──
        await channel.assertQueue(retryQueue, {
            durable: true,
            deadLetterExchange: '', // Routing to default exchange
            deadLetterRoutingKey: queue, // Back to main queue
            messageTtl: 30000, // 30 seconds delay
        });

        // ── 3. SETUP MAIN QUEUE WITH DLX & AUTO-MIGRATION SAFETY ──
        try {
            await channel.assertQueue(queue, {
                durable: true,
                deadLetterExchange: dlxExchange,
                deadLetterRoutingKey: 'failed',
            });
        } catch (err: any) {
            // Queue Precondition Failed Auto-healing
            if (err.code === 406 || (err.message && err.message.includes('PRECONDITION_FAILED'))) {
                console.warn(`⚠️ Queue '${queue}' already exists with different arguments. Re-creating channel to delete and re-assert...`);
                channel = await connection.createChannel();
                await channel.deleteQueue(queue).catch(() => {});
                await channel.assertQueue(queue, {
                    durable: true,
                    deadLetterExchange: dlxExchange,
                    deadLetterRoutingKey: 'failed',
                });
                console.log(`✅ Queue '${queue}' successfully recreated with DLX parameters.`);
            } else {
                throw err;
            }
        }

        // Bind the queue to routing key 'user.deleted'
        await channel.bindQueue(queue, exchange, 'user.deleted');
        console.log(" [*] Waiting for events in %s. To exit press CTRL+C", queue);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const content = msg.content.toString();
                let data: any;
                
                try {
                    data = JSON.parse(content);
                } catch (parseErr) {
                    console.error("❌ Failed to parse message body:", parseErr);
                    // Move parsing failures directly to DLQ
                    channel.nack(msg, false, false);
                    return;
                }

                console.log(` [x] Received user.deleted event for userId: ${data.userId}`);
                
                try {
                    // Automatically soft delete blood donor profile when user is deleted
                    await BloodDonor.destroy({ where: { userId: data.userId } });
                    console.log(` [✓] Successfully removed blood donor profile for userId: ${data.userId}`);
                    
                    channel.ack(msg);
                } catch (err) {
                    console.error(" [!] Failed to process user.deleted event:", err);

                    // Get retry count from headers
                    const headers = msg.properties.headers || {};
                    const retries = headers['x-retries'] || 0;

                    if (retries >= 3) {
                        console.error(`❌ Retries exhausted (Attempt ${retries}). Moving user.deleted event to DLQ.`);
                        channel.nack(msg, false, false);
                    } else {
                        console.warn(`⚠️ Processing failed (Attempt ${retries + 1}/3). Moving to Retry Queue for 30s.`);
                        
                        channel.sendToQueue(
                            retryQueue,
                            msg.content,
                            {
                                persistent: true,
                                headers: {
                                    ...headers,
                                    'x-retries': retries + 1
                                }
                            }
                        );
                        channel.ack(msg);
                    }
                }
            }
        }, { noAck: false });

    } catch (error) {
        console.error('❌ RabbitMQ Subscriber Error in Blood Donor Service:', error);
    }
};
