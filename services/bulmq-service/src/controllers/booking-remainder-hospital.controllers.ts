import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import  {  scheduleBookingHospital } from "../services/booking-hospital.service";





export const assignTaskBookingHospital: any = asyncHandler(async (req: Request, res: Response) => {
  

  try {


    const { 
   
    doctorId,
    hospitalId,
    message } =  
      req.body;

      console.log(req.body, "hiii");
      
      
      
    const results = [];

      const job =
        await scheduleBookingHospital({
          doctorId: doctorId,
         
          subject: message,
          body: message,
          hospitalId,
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