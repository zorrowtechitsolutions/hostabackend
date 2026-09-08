import express from "express";
import ambulanceRoutes from "./ambulance.routes";
import userRoutes from "./user.routes";

import bloodRoutes from "./blood.routes";
import bloodBankRoutes from "./bloodBank.routes";
// import pharmacyRoutes from "./pharmacy.routes";
import staffRoutes from "./staff.routes";
import doctorRoutes from "./doctor.routes";
import specialityRoutes from "./speciality.routes";
import hospitalRoutes from "./hospital.routes";
import bookingRoutes from "./booking.routes";
import medicineReminderRoutes from "./medicinereminder.routes";
import notificationRoutes from "./notification.routes";
import reviewRatingRoutes from "./review.routes"; 
// import labRoutes from "./lab.routes";
import adsRoutes from "./ads.routes";
import roleRoutes from "./role.routes"; 
import s3Routes from "./s3.routes";
import bulmqRoutes from "./bulmq.routes";
import socketioRoutes from "./socketio.routes";
import authRoutes from "./auth.routes";




const router = express.Router();


router.use("/", bloodRoutes);   
router.use("/", bloodBankRoutes);
router.use("/", ambulanceRoutes);   
router.use("/", userRoutes);
// router.use("/", pharmacyRoutes);
router.use("/", staffRoutes);
router.use("/", doctorRoutes);
router.use("/", specialityRoutes);
router.use("/", hospitalRoutes);
router.use("/", bookingRoutes);
router.use("/", medicineReminderRoutes);
router.use("/", notificationRoutes);
router.use("/", reviewRatingRoutes);  
// router.use("/", labRoutes);
router.use("/", adsRoutes); 
router.use("/", roleRoutes);        
router.use("/", s3Routes);
router.use("/", bulmqRoutes);
router.use("/", socketioRoutes);
router.use("/", authRoutes);

export default router;

