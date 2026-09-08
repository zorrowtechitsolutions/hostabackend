import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

console.log("SID:", process.env.TWILIO_ACCOUNT_SID);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function test() {
  try {
    const response = await client.messages.create({
      to: "whatsapp:+919999999999", 
      from: "whatsapp:+14155238886", // Twilio WhatsApp Sandbox number
      body: "Test message from Hosta Sandbox",
    });
    console.log("Success! SID:", response.sid);
  } catch (error) {
    console.error("Failed to send WhatsApp:", error);
  }
}

test();
