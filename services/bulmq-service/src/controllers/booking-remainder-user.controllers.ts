import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import  { scheduleBooking} from "../services/booking-user.service";



export const assignTaskBooking: any = asyncHandler(async (req: Request, res: Response) => {
  

  try {

    const { 
    patient_phone,
    doctorId,
    status,
    consulting_time,
    message } =  
      req.body;
    

    const results = [];

      const job =
        await scheduleBooking({
          phone: patient_phone,
          doctorId: doctorId,
          status: status,
          subject: message,
          body: message,
          consulting_time: consulting_time,
         
          sendAt:   new Date() 
        });

      results.push(job.id);


    res.json({
      success: true,
      jobIds: results,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
  
});







