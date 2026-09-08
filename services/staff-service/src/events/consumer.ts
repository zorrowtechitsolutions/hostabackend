import amqp from 'amqplib';
import { env } from '../config/env';
import Staff from '../models/staff.model';

let channel: amqp.Channel;
let connection: any;

export const connectRabbitMQConsumer = async () => {
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!connected && attempts < maxAttempts) {
        try {
            connection = await amqp.connect(env.RABBITMQ_URL);

            connection.on('error', (err: any) => {
                console.error('❌ Staff Service RabbitMQ Consumer Error:', err);
            });

            connection.on('close', () => {
                console.warn('⚠️ Staff Service RabbitMQ Consumer closed. Retrying...');
                channel = null as any;
                setTimeout(connectRabbitMQConsumer, 5000);
            });

            channel = await connection.createChannel();
            console.log('🐰 Staff Service connected to RabbitMQ (Consumer)');
            connected = true;

            await startConsumers();

        } catch (error) {
            attempts++;
            console.error(`❌ RabbitMQ Consumer Connection attempt ${attempts} failed:`, error instanceof Error ? error.message : error);
            if (attempts < maxAttempts) {
                console.log("Retrying in 5 seconds...");
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
                console.error("Max RabbitMQ consumer connection attempts reached.");
            }
        }
    }
};

const startConsumers = async () => {
    if (!channel) return;

    const exchange = 'staff_events';
    await channel.assertExchange(exchange, 'direct', { durable: true });

    const dlxExchange = "staff_dlx";
    const dlqQueue = "staff_dlq";
    
    await channel.assertExchange(dlxExchange, "direct", { durable: true });
    await channel.assertQueue(dlqQueue, { durable: true });
    await channel.bindQueue(dlqQueue, dlxExchange, "failed");

    const assertQueueWithDLQ = async (queueName: string) => {
        try {
            await channel.assertQueue(queueName, {
                durable: true,
                deadLetterExchange: dlxExchange,
                deadLetterRoutingKey: "failed",
            });
        } catch (err: any) {
            if (err.code === 406 || (err.message && err.message.includes("PRECONDITION_FAILED"))) {
                console.warn(`⚠️ Queue '${queueName}' exists with different arguments. Re-creating...`);
                channel = await connection.createChannel();
                await channel.deleteQueue(queueName).catch(() => { });
                await channel.assertQueue(queueName, {
                    durable: true,
                    deadLetterExchange: dlxExchange,
                    deadLetterRoutingKey: "failed",
                });
            } else { throw err; }
        }
        return { queue: queueName };
    };

    const assertRetryQueue = async (queueName: string) => {
        const retryQueueName = `${queueName}_retry`;
        await channel.assertQueue(retryQueueName, {
            durable: true,
            deadLetterExchange: "",
            deadLetterRoutingKey: queueName,
            messageTtl: 30000,
        });
        return retryQueueName;
    };

    const handleRetry = (msg: any, retryQueue: string) => {
        const headers = msg.properties.headers || {};
        const retries = headers["x-retries"] || 0;
        if (retries >= 3) {
            console.error(`❌ Retries exhausted (Attempt ${retries}). Moving message to Dead Letter Queue (DLQ).`);
            channel.nack(msg, false, false);
        } else {
            console.warn(`⚠️ Processing failed (Attempt ${retries + 1}/3). Moving to Retry Queue for a 30s delay.`);
            channel.sendToQueue(retryQueue, msg.content, {
                persistent: true,
                headers: { ...headers, "x-retries": retries + 1 }
            });
            channel.ack(msg);
        }
    };

    // Listen for AUTH_CREATED events from Auth Service
    const authQueue = await assertQueueWithDLQ('staff_auth_created_queue');
    const authRetryQueue = await assertRetryQueue('staff_auth_created_queue');
    await channel.bindQueue(authQueue.queue, exchange, 'AUTH_CREATED');

    channel.consume(authQueue.queue, async (msg) => {
        if (msg !== null) {
            try {
                const data = JSON.parse(msg.content.toString());
                console.log("📨 Staff Service received AUTH_CREATED event:", data);

                // Update Staff status from PENDING to ACTIVE
                const [affectedCount] = await Staff.update(
                    { status: 'ACTIVE' },
                    { where: { id: data.staffId, hospitalId: data.hospitalId } }
                );

                if (affectedCount > 0) {
                    console.log(`✅ Staff ID ${data.staffId} status updated to ACTIVE`);
                } else {
                    console.warn(`⚠️ Staff ID ${data.staffId} not found for status update`);
                }

                // Acknowledge message
                channel.ack(msg);
            } catch (error) {
                console.error("❌ Error processing AUTH_CREATED event:", error);
                handleRetry(msg, authRetryQueue);
            }
        }
    });

    // Listen for AUTH_FAILED events from Auth Service (Compensating Transaction)
    const authFailedQueue = await assertQueueWithDLQ('staff_auth_failed_queue');
    const authFailedRetryQueue = await assertRetryQueue('staff_auth_failed_queue');
    await channel.bindQueue(authFailedQueue.queue, exchange, 'AUTH_FAILED');

    channel.consume(authFailedQueue.queue, async (msg) => {
        if (msg !== null) {
            try {
                const data = JSON.parse(msg.content.toString());
                console.log("📨 Staff Service received AUTH_FAILED event:", data);

                // Rollback: Delete the stuck PENDING Staff record
                const deletedCount = await Staff.destroy({
                    where: { id: data.staffId, hospitalId: data.hospitalId, status: 'PENDING' }
                });

                if (deletedCount > 0) {
                    console.log(`✅ Rolled back: Staff ID ${data.staffId} deleted successfully`);
                } else {
                    console.warn(`⚠️ Rollback warning: Staff ID ${data.staffId} not found or not in PENDING state`);
                }

                channel.ack(msg);
            } catch (error) {
                console.error("❌ Error processing AUTH_FAILED event:", error);
                handleRetry(msg, authFailedRetryQueue);
            }
        }
    });

    console.log("🎧 Staff Service listening for AUTH_CREATED events");
};
