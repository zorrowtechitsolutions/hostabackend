import amqp from 'amqplib';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const startSubscriber = async () => {
    try {
        if (!env.RABBITMQ_URL) {
            logger.warn('⚠️ RABBITMQ_URL not defined. Subscriber disabled.');
            return;
        }

        const connection = await amqp.connect(env.RABBITMQ_URL);
        let channel = await connection.createChannel();
        const exchange = 'user_events'; // Listening to core user events
        
        await channel.assertExchange(exchange, 'direct', { durable: true });
        
        const queue = 'blood_bank_events_queue';
        const dlxExchange = 'blood_bank_dlx';
        const dlqQueue = 'blood_bank_dlq';
        const retryQueue = 'blood_bank_retry_queue';

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
                logger.warn(`⚠️ Queue '${queue}' already exists with different arguments. Re-creating channel to delete and re-assert...`);
                channel = await connection.createChannel();
                await channel.deleteQueue(queue).catch(() => {});
                await channel.assertQueue(queue, {
                    durable: true,
                    deadLetterExchange: dlxExchange,
                    deadLetterRoutingKey: 'failed',
                });
                logger.info(`✅ Queue '${queue}' successfully recreated with DLX parameters.`);
            } else {
                throw err;
            }
        }
        
        logger.info(` [*] Blood Bank Service waiting for events in ${queue}`);
        
        // Example binding: Listening for user deletions
        await channel.bindQueue(queue, exchange, 'user.deleted');

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const content = msg.content.toString();
                let data: any;

                try {
                    data = JSON.parse(content);
                } catch (parseErr) {
                    logger.error("❌ Failed to parse message body:", parseErr);
                    // Move parsing failures directly to DLQ
                    channel.nack(msg, false, false);
                    return;
                }

                logger.info(` [x] Received event for processing in Blood Bank: ${msg.fields.routingKey}`, { data });
                
                try {
                    // TODO: Add logic to update blood inventory if necessary
                    
                    // Acknowledge the message
                    channel.ack(msg);
                } catch (err) {
                    logger.error(" [!] Failed to process blood bank subscriber event:", err);

                    // Get retry count from headers
                    const headers = msg.properties.headers || {};
                    const retries = headers['x-retries'] || 0;

                    if (retries >= 3) {
                        logger.error(`❌ Retries exhausted (Attempt ${retries}). Moving event to DLQ.`);
                        channel.nack(msg, false, false);
                    } else {
                        logger.warn(`⚠️ Processing failed (Attempt ${retries + 1}/3). Moving to Retry Queue for 30s.`);
                        
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
        logger.error('❌ RabbitMQ Subscriber Error:', error);
    }
};
