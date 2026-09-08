// import { Request, Response, NextFunction } from "express";

// export const verifyInternalRequest = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const secret = req.headers["x-service-secret"];

//   if (secret !== process.env.INTERNAL_SERVICE_SECRET) {
//     return res.status(401).json({
//       success: false,
//       message: "Unauthorized service",
//     });
//   }

//   next();
// };
import {Request,Response,NextFunction} from "express";

export const verifyInternalRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("========== INTERNAL AUTH ==========");
  console.log("Header :", req.headers["x-service-secret"]);
  console.log("Expected:", process.env.INTERNAL_SERVICE_SECRET);

  if (req.headers["x-service-secret"] !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized service",
    });
  }

  next();
};