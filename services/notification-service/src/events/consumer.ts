import amqp from "amqplib";
import { env } from "../config/env";
import { socketEmitter } from "../utils/socket.emitter";
import { handleBookingEvent } from "../handlers/booking.handler";
import { handleDoctorEvent } from "../handlers/doctor.handler";
import { handleStaffEvent } from "../handlers/staff.handler";
import { handleHospitalEvent } from "../handlers/hospital.handler";
import { handlePatientEvent } from "../handlers/patient.handler";
import { handlePrescriptionEvent } from "../handlers/prescription.handler";
import { handleAdEvent } from "../handlers/ad.handler";
import { handleAmbulanceEvent } from "../handlers/ambulance.handler";
import { handleBloodEvent } from "../handlers/blood.handler";
import { handleBloodBankEvent } from "../handlers/bloodbankhandler";
import { handleEmailEvent } from "../handlers/email.handler";

let connection: any;
let channel: amqp.Channel;
let isReconnecting = false;

const reconnectRabbitMQ = () => {
    if (isReconnecting) return;
    isReconnecting = true;
    console.log("🔄 Reconnecting to RabbitMQ in 5 seconds...");
    setTimeout(async () => {
        try {
            await startConsumer();
        } catch (err) {
            isReconnecting = false;
            reconnectRabbitMQ();
        }
    }, 5000);
};

export const startConsumer = async () => {
    try {
        isReconnecting = false;
        connection = await amqp.connect(env.RABBITMQ_URL);
        channel = await connection.createChannel();

        console.log("🐰 Notification Service connected to RabbitMQ");

        connection.on("error", (err) => {
            console.error("❌ RabbitMQ Connection Error in Notification Service:", err);
        });

        connection.on("close", () => {
            console.warn("⚠️ RabbitMQ Connection closed in Notification Service. Retrying...");
            reconnectRabbitMQ();
        });

        const queue = "notification_queue";
        const dlxExchange = "notification_dlx";
        const dlqQueue = "notification_dlq";
        const retryQueue = "notification_retry_queue";

        // ── 1. SETUP DEAD LETTER EXCHANGE & QUEUE ──
        await channel.assertExchange(dlxExchange, "direct", { durable: true });
        await channel.assertQueue(dlqQueue, { durable: true });
        await channel.bindQueue(dlqQueue, dlxExchange, "failed");

        // ── 2. SETUP RETRY QUEUE ──
        // This queue holds failed messages for 30s, then automatically sends them back to the main queue
        await channel.assertQueue(retryQueue, {
            durable: true,
            deadLetterExchange: "", // Empty string means default exchange (direct routing to queue name)
            deadLetterRoutingKey: queue, // Back to main queue
            messageTtl: 30000, // 30 seconds
        });

        // ── 3. SETUP MAIN QUEUE WITH DLX BINDINGS (WITH AUTO-MIGRATION SAFETY) ──
        try {
            await channel.assertQueue(queue, {
                durable: true,
                deadLetterExchange: dlxExchange,
                deadLetterRoutingKey: "failed",
            });
        } catch (err: any) {
            // If the queue already exists with different arguments (Precondition Failed / code 406)
            if (err.code === 406 || (err.message && err.message.includes("PRECONDITION_FAILED"))) {
                console.warn(`⚠️ Queue '${queue}' already exists with different arguments. Re-creating channel to delete and re-assert...`);

                // Re-establish connection channel since code 406 automatically closes the current channel
                channel = await connection.createChannel();
                await channel.deleteQueue(queue).catch(() => { });

                // Re-assert main queue
                await channel.assertQueue(queue, {
                    durable: true,
                    deadLetterExchange: dlxExchange,
                    deadLetterRoutingKey: "failed",
                });
                console.log(`✅ Queue '${queue}' successfully recreated with DLX parameters.`);
            } else {
                throw err;
            }
        }

        // 1. Hospital
        await channel.assertExchange("hospital_events", "direct", { durable: true });
        await channel.bindQueue(queue, "hospital_events", "HOSPITAL_REGISTERED");
        await channel.bindQueue(queue, "hospital_events", "HOSPITAL_UPDATED");
        await channel.bindQueue(queue, "hospital_events", "HOSPITAL_DELETED");
        await channel.bindQueue(queue, "hospital_events", "HOSPITAL_BLACKLISTED");
        await channel.bindQueue(queue, "hospital_events", "HOSPITAL_RECOVERED");

        // 2. Booking
        await channel.assertExchange("booking_events", "direct", { durable: true });
        await channel.bindQueue(queue, "booking_events", "BOOKING_REGISTERED");
        await channel.bindQueue(queue, "booking_events", "BOOKING_UPDATED");
        await channel.bindQueue(queue, "booking_events", "BOOKING_CANCELLED");
        await channel.bindQueue(queue, "booking_events", "BOOKING_ACCEPTED");
        await channel.bindQueue(queue, "booking_events", "BOOKING_COMPLETED");
        await channel.bindQueue(queue, "booking_events", "BOOKING_LIMIT_REACHED");

        // 3. Doctor
        await channel.assertExchange("doctor_events", "direct", { durable: true });
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_REGISTERED");
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_UPDATED");
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_DELETED");
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_RECOVERED");
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_PASSWORD_RESET");
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_PASSWORD_CHANGED");
        await channel.bindQueue(queue, "doctor_events", "DOCTOR_PASSWORD_CHANGED_BY_ADMIN");

        // 4. Blood Bank
        await channel.assertExchange("blood_bank_events", "direct", { durable: true });
        await channel.bindQueue(queue, "blood_bank_events", "STOCK_CREATED");
        await channel.bindQueue(queue, "blood_bank_events", "STOCK_UPDATED");
        await channel.bindQueue(queue, "blood_bank_events", "STOCK_DELETED");

        // 5. Blood Donor
        await channel.assertExchange("blood_events", "direct", { durable: true });
        await channel.bindQueue(queue, "blood_events", "DONOR_REGISTERED");
        await channel.bindQueue(queue, "blood_events", "DONOR_UPDATED");
        await channel.bindQueue(queue, "blood_events", "DONOR_DELETED");

        // 6. User
        await channel.assertExchange("user_events", "direct", { durable: true });
        await channel.bindQueue(queue, "user_events", "USER_REGISTERED");
        await channel.bindQueue(queue, "user_events", "user.deleted");

        // 7. Patient
        await channel.assertExchange("patient_events", "direct", { durable: true });
        await channel.bindQueue(queue, "patient_events", "PATIENT_REGISTERED");
        await channel.bindQueue(queue, "patient_events", "PATIENT_UPDATED");
        await channel.bindQueue(queue, "patient_events", "PATIENT_DELETED");
        await channel.bindQueue(queue, "patient_events", "PATIENT_RECOVERED");

        // 8. Ambulance
        await channel.assertExchange("ambulance_events", "direct", { durable: true });
        await channel.bindQueue(queue, "ambulance_events", "AMBULANCE_REGISTERED");
        await channel.bindQueue(queue, "ambulance_events", "AMBULANCE_UPDATED");
        await channel.bindQueue(queue, "ambulance_events", "AMBULANCE_DELETED");

        // 9. Staff
        await channel.assertExchange("staff_events", "direct", { durable: true });
        await channel.bindQueue(queue, "staff_events", "STAFF_REGISTERED");
        await channel.bindQueue(queue, "staff_events", "STAFF_UPDATED");
        await channel.bindQueue(queue, "staff_events", "STAFF_DELETED");
        await channel.bindQueue(queue, "staff_events", "STAFF_RECOVERED");
        await channel.bindQueue(queue, "staff_events", "STAFF_PASSWORD_RESET");
        await channel.bindQueue(queue, "staff_events", "STAFF_PASSWORD_CHANGED");
        await channel.bindQueue(queue, "staff_events", "STAFF_PASSWORD_CHANGED_BY_ADMIN");

        // 10. Lab & Test & Report
        await channel.assertExchange("lab_events", "direct", { durable: true });
        await channel.bindQueue(queue, "lab_events", "LAB_REGISTERED");
        await channel.bindQueue(queue, "lab_events", "LAB_UPDATED");
        await channel.bindQueue(queue, "lab_events", "LAB_DELETED");
        await channel.assertExchange("test_events", "direct", { durable: true });
        await channel.bindQueue(queue, "test_events", "TEST_REGISTERED");
        await channel.assertExchange("report_events", "direct", { durable: true });
        await channel.bindQueue(queue, "report_events", "REPORT_REGISTERED");
        await channel.bindQueue(queue, "report_events", "REPORT_UPDATED");

        // 11. Pharmacy
        await channel.assertExchange("pharmacy_queue", "direct", { durable: true });
        await channel.bindQueue(queue, "pharmacy_queue", "PHARMACY_UPDATED");
        await channel.bindQueue(queue, "pharmacy_queue", "PHARMACY_DELETED");

        // 12. Speciality
        await channel.assertExchange("speciality_events", "direct", { durable: true });
        await channel.bindQueue(queue, "speciality_events", "SPECIALITY_REGISTERED");

        // 13. Ads
        await channel.assertExchange("ad_events", "direct", { durable: true });
        await channel.bindQueue(queue, "ad_events", "AD_CREATED");
        await channel.bindQueue(queue, "ad_events", "AD_UPDATED");
        await channel.bindQueue(queue, "ad_events", "AD_DELETED");

        // 14. Prescription
        await channel.assertExchange("prescription_events", "direct", { durable: true });
        await channel.bindQueue(queue, "prescription_events", "PRESCRIPTION_CREATED");
        await channel.bindQueue(queue, "prescription_events", "PRESCRIPTION_UPDATED");
        await channel.bindQueue(queue, "prescription_events", "PRESCRIPTION_DELETED");

        // 15. Email
        await channel.assertExchange("email_events", "direct", { durable: true });
        await channel.bindQueue(queue, "email_events", "EMAIL_SEND");

        console.log(`📥 Notification Consumer started on queue: ${queue}`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    const routingKey = msg.fields.routingKey;

                    console.log(`📩 Received event: ${routingKey}`, JSON.stringify(content, null, 2));

                    // ── Global System Broadcast ──
                    socketEmitter.emit("system_event", {
                        message: `[${routingKey}] Event Triggered!`,
                        data: content,
                    });

                    // ── Delegate Event Handling to Respective Handlers ──
                    if (routingKey.startsWith("BOOKING_")) {
                        await handleBookingEvent(routingKey, content);
                    } else if (routingKey.startsWith("DOCTOR_")) {
                        await handleDoctorEvent(routingKey, content);
                    } else if (routingKey.startsWith("STAFF_")) {
                        await handleStaffEvent(routingKey, content);
                    } else if (routingKey.startsWith("HOSPITAL_")) {
                        await handleHospitalEvent(routingKey, content);
                    } else if (routingKey.startsWith("PATIENT_")) {
                        await handlePatientEvent(routingKey, content);
                    } else if (routingKey.startsWith("PRESCRIPTION_")) {
                        await handlePrescriptionEvent(routingKey, content);
                    } else if (routingKey.startsWith("AD_")) {
                        await handleAdEvent(routingKey, content);
                    } else if (routingKey.startsWith("AMBULANCE_")) {
                        await handleAmbulanceEvent(routingKey, content);
                    } else if (routingKey.startsWith("DONOR_")) {
                        await handleBloodEvent(routingKey, content);
                    } else if (routingKey.startsWith("STOCK_")) {
                        await handleBloodBankEvent(routingKey, content);
                    } else if (routingKey === "EMAIL_SEND") {
                        await handleEmailEvent(routingKey, content);
                    }

                    channel.ack(msg);
                } catch (consumeErr) {
                    console.error("❌ Error consuming event:", consumeErr);

                    // Get the current retry attempt count from RabbitMQ message headers
                    const headers = msg.properties.headers || {};
                    const retries = headers["x-retries"] || 0;

                    if (retries >= 3) {
                        console.error(`❌ Retries exhausted (Attempt ${retries}). Moving message to Dead Letter Queue (DLQ).`);
                        // Reject message without requeue (sends it automatically to DLX/DLQ)
                        channel.nack(msg, false, false);
                    } else {
                        console.warn(`⚠️ Processing failed (Attempt ${retries + 1}/3). Moving to Retry Queue for a 30s delay.`);

                        // Forward the message to the retry queue with incremented retry count header
                        channel.sendToQueue(
                            retryQueue,
                            msg.content,
                            {
                                persistent: true,
                                headers: {
                                    ...headers,
                                    "x-retries": retries + 1
                                }
                            }
                        );

                        // Acknowledge the original message so it doesn't stay in the main queue
                        channel.ack(msg);
                    }
                }
            }
        });
    } catch (error) {
        console.error("❌ Consumer Error:", error);
        reconnectRabbitMQ();
    }
};

export const closeRabbitMQ = async () => {
    try {
        if (channel) {
            await channel.close().catch(() => { });
        }
        if (connection) {
            await connection.close().catch(() => { });
        }
        console.log("✅ RabbitMQ Connection cleanly closed.");
    } catch (err) {
        console.error("❌ Error closing RabbitMQ connection:", err);
    }
};