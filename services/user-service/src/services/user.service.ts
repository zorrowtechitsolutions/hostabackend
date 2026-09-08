import bcrypt from "bcryptjs";
import User from "../models/user.model";
import  Patient  from "../models/patient.model";
import { generateToken, generateRefreshToken } from "./jwt.service";
import twilio from "twilio";
import { logger } from "../utils/logger";
import { publishEvent } from "../events/publisher";
import { sendEmail } from "./mail.service";
import { getBlacklistedUsers } from "../controllers/user.controller";





let twilioClient: any = null;

const getTwilioClient = () => {
  if (twilioClient) return twilioClient;
  
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  
  if (!sid || !token) {
    logger.warn("Twilio credentials NOT FOUND in environment variables. SMS will NOT be sent.");
    return null;
  }
  
  try {
    twilioClient = twilio(sid, token);
    return twilioClient;
  } catch (error) {
    logger.error("Failed to initialize Twilio client", error);
    return null;
  }
};

const APPLE_TEST_NUMBER = "9999999999";
const APPLE_TEST_OTP = "123456";

const sendOtpEmail = async (email: string, otp: string, userName: string) => {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <div style="background-color: #007bff; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Hosta Health</h1>
      </div>
      <div style="padding: 40px; background-color: #ffffff;">
        <h2 style="color: #333; margin-top: 0;">Verification Code</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Use the following security code to reset your password. This code is valid for <strong>10 minutes</strong>.</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="display: inline-block; background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px 40px; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px;">
            ${otp}
          </div>
        </div>
        
        <p style="color: #999; font-size: 14px; line-height: 1.5; border-top: 1px solid #eee; pt: 20px;">
          If you didn't request this, please ignore this email or contact support if you have concerns.
        </p>
      </div>
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px;">
        &copy; 2026 Hosta Health. All rights reserved.
      </div>
    </div>
  `;

  await sendEmail(email, "Your Verification Code - Hosta Health", html);
};


export const userService = {
  async register(data: any) {
    const t = await Patient.sequelize!.transaction();

    logger.info("Registering user: checking existing email", { email: data.email });
    const exist = await User.findOne({ where: { email: data.email } });
    if (exist) {
      await t.rollback();
      logger.info("User already exists", { email: data.email });
      throw { status: 400, message: "User already exists", code: "USER_EXISTS" };
    }

    logger.info("Hashing password");
    const hashedPassword = await bcrypt.hash(data.password, 10);

    logger.info("Creating user in DB");
    try {
      const user = await User.create(
        { ...data, password: hashedPassword },
        { transaction: t }
      );


      // Note: Patient auto-creation logic removed as per requirements.

      await t.commit();

      logger.info("User created successfully", { id: user.id });
      
      try {
        await publishEvent("user_events", "USER_REGISTERED", {
          userId: user.id,
          email: user.email,
          roleId: user.roleId,
          name: data?.name
        });


      } catch (err) {
        logger.error("Failed to publish user/patient registered events", err);
      }

      const { password: _, ...safeUser } = user.toJSON();
      return safeUser;
    } catch (dbError: any) {
      await t.rollback();

      if (dbError.name === 'SequelizeUniqueConstraintError') {
        const message = dbError.errors[0]?.message || "Unique constraint violation";
        logger.info("Registration failed: Unique constraint", { message });
        throw { status: 400, message, code: "VALIDATION_ERROR" };
      }

      logger.error("Sequelize Creation Error", {
        message: dbError.message,
        errors: dbError.errors,
        original: dbError.original,
      });
      throw dbError;
    }
  },

  async login(data: any) {
    const user = await User.findOne({ where: { email: data.email } });

    if (!user) {
      throw { status: 404, message: "User not found" };
    }

         if (user.isDelete === true) {
  await user.update( {
    isDelete: false,
    isActive: true,
    deleteDate: null,
  });
}

    const match = await bcrypt.compare(data.password, user.password || "");
    if (!match) {
      throw { status: 401, message: "Wrong password" };
    }

 


   interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}
if (data.fcmToken) {
  const user = await User.findOne({
    where: { email: data.email },
  });

  if (user) {
    const parseToken = (token: any): any => {
      let parsed = token;
      while (typeof parsed === 'string') {
        try {
          const next = JSON.parse(parsed);
          if (next === parsed) break;
          parsed = next;
        } catch {
          break;
        }
      }
      return parsed;
    };

    const existingRaw = (user.get("fcmToken") as any[]) || [];
    const existingTokens: FCMTOKEN[] = Array.isArray(existingRaw)
      ? existingRaw.map(parseToken)
      : [];

    const newRaw = Array.isArray(data.fcmToken) ? data.fcmToken : [data.fcmToken];
    const newTokens: FCMTOKEN[] = newRaw.map(parseToken);

    const updatedTokens = [
      ...existingTokens.filter(
        existing => !newTokens.some(incoming => incoming.deviceId === existing.deviceId)
      ),
      ...newTokens,
    ];

    await user.update({
      fcmToken: updatedTokens,
    });
  }
}


    const token = generateToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });


    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId  })
    const { password: _, ...safeUser } = user.toJSON();
    return { token, refreshToken, user: safeUser };
  },

  async loginWithPhone(phone: string) {
    let numericPhone = phone.replace(/\D/g, "").slice(-10);

    if (!numericPhone) {
      throw { status: 400, message: "Invalid phone number" };
    }

    const user = await User.findOne({ where: { phone: numericPhone } });
    if (!user) {
      throw { status: 400, message: "Phone number not registered!" };
    }

   if (user.isDelete === true) {
  await user.update( {
    isDelete: false,
    isActive: true,
    deleteDate: null,
  });
  

 
}

    const otp = numericPhone === APPLE_TEST_NUMBER 
      ? APPLE_TEST_OTP 
      : Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 5-minute expiry (Scalable without Redis)
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); 
    await user.save();

    if (numericPhone !== APPLE_TEST_NUMBER) {
        try {
          const client = getTwilioClient();
          const from = process.env.TWILIO_NUMBER;
          
          if (client && from) {
            // Support different country codes (Default to +91 if not specified)
            const targetNumber = phone.startsWith("+") ? phone : `+91${numericPhone}`;
            
            await client.messages.create({
              body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
              from: from,
              to: targetNumber,
            });
            logger.info("OTP SMS sent successfully", { phone: targetNumber });
          } else {
            logger.warn("Development Mode: OTP created but not sent via SMS (Missing Twilio Config)", { 
              numericPhone, 
              otp 
            });
          }
        } catch (twilioError: any) {
          logger.error("Production Error: Twilio SMS failed to send", { 
            error: twilioError.message, 
            phone: numericPhone,
            otp 
          });
          // Note: OTP is still recorded in DB, so user can check logs to proceed in dev environment
        }
    }



    return { 
        message: numericPhone === APPLE_TEST_NUMBER ? "OTP sent (TEST ACCOUNT)" : "OTP sent successfully", 
        otp: numericPhone === APPLE_TEST_NUMBER ? APPLE_TEST_OTP : otp 
    };
  },

  async verifyOtp(data: { phone: string; otp: string; fcmToken?: []}) {
    let numericPhone = data.phone.replace(/\D/g, "").slice(-10);

    const user = await User.findOne({ where: { phone: numericPhone, isDelete: false } });
    
    if (!user || user.otp !== data.otp.toString()) {
      throw { status: 400, message: "Invalid OTP" };
    }

    // Check expiry
    if (user.otpExpiry && new Date() > user.otpExpiry) {
      throw { status: 400, message: "OTP has expired" };
    }


   interface FCMTOKEN {
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
}


if (data.fcmToken) {
  const user = await User.findOne({
    where: { phone: data.phone },
  });

  if (user) {
    const parseToken = (token: any): any => {
      let parsed = token;
      while (typeof parsed === 'string') {
        try {
          const next = JSON.parse(parsed);
          if (next === parsed) break;
          parsed = next;
        } catch {
          break;
        }
      }
      return parsed;
    };

    const existingRaw = (user.get("fcmToken") as any[]) || [];
    const existingTokens: FCMTOKEN[] = Array.isArray(existingRaw)
      ? existingRaw.map(parseToken)
      : [];

    const newRaw = Array.isArray(data.fcmToken) ? data.fcmToken : [data.fcmToken];
    const newTokens: FCMTOKEN[] = newRaw.map(parseToken);

    const updatedTokens = [
      ...existingTokens.filter(
        existing => !newTokens.some(incoming => incoming.deviceId === existing.deviceId)
      ),
      ...newTokens,
    ];

    await user.update({
      fcmToken: updatedTokens,
    });

  }
}

    // Clear OTP after successful verification
    user.otp = undefined as any;
    user.otpExpiry = undefined as any;
    
    await user.save();

    const token = generateToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });
    const userJson = user.toJSON();
    delete (userJson as any).password;
    delete (userJson as any).otp;
    delete (userJson as any).otpExpiry;

    return { token, refreshToken, user: userJson };
  },


  // async getAllUsers() {
  //   return await User.findAll({
  //     where: {  }
      
  //   });
  // },

  async getAllUsers() {
  return await User.findAll({
    where: {},
    paranoid: false, // only if using Sequelize soft delete
  });
},

  async getBlacklistedUsers() {
    return await User.findAll({
      where: { isDelete: true }
    });
  },

  async getUserById(id: string) {
    const user = await User.findOne({ where: { id, isDelete: false } });
    if (!user) throw { status: 404, message: "User not found" };
    return user;
  },

  async deleteUser(id: string) {
    const user = await User.findOne({ where: { id, isDelete: false } });
    if (!user) throw { status: 404, message: "User not found" };
    
    await user.update({
      isActive: false,
      isDelete: true,
      deleteDate: new Date(),
    }); // Move to blacklist
    
    // Broadcast to other services (like blood-service) so they can cleanup too
    await publishEvent('user_events', 'USER_DELETED', { userId: id });
  },

  async recoverUser(id: string) {
    const user = await User.findOne({ where: { id, isDelete: true } });
    if (!user) throw { status: 404, message: "Blacklisted user not found" };

    await user.update({
      isActive: true,
      isDelete: false,
      deleteDate: null,
    });

    await publishEvent('user_events', 'USER_RECOVERED', { userId: id });

    return user;
  },

  // async resetPassword(data: any) {
  //   const user = await User.findOne({ where: { email: data.email } });
  //   if (!user) throw { status: 404, message: "User not found" };

  //   if (data.password) {
  //     const match = await bcrypt.compare(data.password, user.password);
  //     if (!match) throw { status: 401, message: "Incorrect current password" };
  //   }

  //   user.password = await bcrypt.hash(data.newPassword, 10);
  //   await user.save();
  // },
  // In user.service.ts
async resetPasswordByEmail(data: { email: string; newPassword: string }) {
  const { email, newPassword } = data;
  const user = await User.findOne({ where: { email, isDelete: false } });
  if (!user) throw { status: 404, message: "User not found" };

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = null as any;
  user.otpExpiry = null as any;
  await user.save();

  return { success: true, message: "Password reset successful" };
},

  async sendOtpByEmail(email: string) {
    const user = await User.findOne({ where: { email, isDelete: false } });
    if (!user) {
      throw { status: 404, message: "User not found with this email" };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    try {
      await sendOtpEmail(email, otp, user.name);
      return { success: true, message: "OTP sent to email" };
    } catch (error) {
      throw { status: 500, message: "Failed to send email" };
    }
  },

  async verifyOtpEmail(data: { email: string; otp: string }) {
    const user = await User.findOne({ where: { email: data.email, isDelete: false } });
    
    if (!user || user.otp !== data.otp.toString()) {
      throw { status: 400, message: "Invalid OTP" };
    }

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      throw { status: 400, message: "OTP has expired" };
    }

    // Clear OTP after successful verification
    user.otp = undefined as any;
    user.otpExpiry = undefined as any;
    await user.save();

    const token = generateToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: "user", roleId: user.roleId });
    const userJson = user.toJSON();
    delete (userJson as any).password;
    delete (userJson as any).otp;
    delete (userJson as any).otpExpiry;

    return { token, refreshToken, user: userJson };
  },

  // async resetPasswordWithEmail(data: any) {
  //   const { email, otp, newPassword } = data;
  //   const user = await User.findOne({ where: { email, isDelete: false } });

  //   if (!user || user.otp !== otp.toString() || (user.otpExpiry && new Date() > user.otpExpiry)) {
  //     throw { status: 400, message: "Invalid or expired OTP" };
  //   }

  //   user.password = await bcrypt.hash(newPassword, 10);
  //   user.otp = undefined as any;
  //   user.otpExpiry = undefined as any;
  //   await user.save();

  //   return { success: true, message: "Password reset successful" };
  // },


  
async resetPasswordWithEmail(userId: string, data: any) {
  const { newPassword, confirmPassword } = data;

  if (!newPassword || !confirmPassword) {
    throw {
      status: 400,
      message: "New password and confirm password are required",
    };
  }

  if (newPassword !== confirmPassword) {
    throw {
      status: 400,
      message: "Passwords do not match",
    };
  }

  const user = await User.findOne({
    where: { id: userId, isDelete: false },
  });

  if (!user) {
    throw {
      status: 404,
      message: "User not found",
    };
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = null as any;
  user.otpExpiry = null as any;

  await user.save();

  return {
    success: true,
    message: "Password reset successful",
  };
},







  async changePassword(userId: string, data: any) {
    const { currentPassword, newPassword } = data;
    const user = await User.findOne({ where: { id: userId, isDelete: false } });
    
    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password || "");
    if (!isMatch) {
      throw { status: 401, message: "Incorrect current password" };
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { success: true, message: "Password changed successfully" };
  },

  async saveExpoToken(id: string, token: []) {
    const user = await User.findOne({ where: { id, isDelete: false } });
    if (!user) throw { status: 404, message: "User not found" };

    user.fcmToken = token;
    await user.save();
    return user;
  },

  async testPushNotification(id: string) {
    // In original code, it invoked getIO().emit. In a microservices architecture, this could
    // be published to rabbitmq or pushed directly if web sockets reside here.
    return { message: "Test triggered successfully for user " + id };
  },

  async updateUser(id: string, data: any) {
    const user = await User.findOne({ where: { id, isDelete: false } });
    if (!user) throw { status: 404, message: "User not found" };

    await user.update(data);
    const { password: _, ...updatedUser } = user.toJSON();
        await publishEvent('user_events', 'USER_UPDATED', { userId: id });

    return updatedUser;
  }
};
