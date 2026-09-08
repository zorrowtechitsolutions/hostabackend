// import { Request, Response, NextFunction } from "express";
// import CircuitBreaker from "opossum";
// import { httpClient } from "../utils/httpClient";
// import { SERVICES } from "../config/services";
// import { logger } from "../utils/logger";

// const callPharmacyService = async (options: any) => {
//   return httpClient(options);
// };

// const breaker = new CircuitBreaker(callPharmacyService, {
//   timeout: 10000, 
//   errorThresholdPercentage: 50, 
//   resetTimeout: 10000,
// });

// breaker.fallback(() => {
//   return { status: 503, data: { success: false, message: "Pharmacy service temporarily unavailable" } };
// });

// export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // Pharmacy service is mapped at root / internally
//     const url = `${SERVICES.PHARMACY_SERVICE}${req.originalUrl.replace("/api/pharmacy", "")}`;

//     const options = {
//       method: req.method,
//       url: url,
//       data: req.body,
//       params: req.query,
//       headers: {
//         ...(() => {
//           const { host, "content-length": contentLength, "transfer-encoding": transferEncoding, ...headers } = req.headers;
//           return headers;
//         })(),
//         "X-Request-ID": (req as any).id,
//       },
//       validateStatus: (status: number) => status < 500, 
//     };

//     const response: any = await breaker.fire(options);

//     if (response.headers && response.headers['set-cookie']) {
//       res.setHeader('Set-Cookie', response.headers['set-cookie']);
//     }

//     res.status(response.status).json(response.data);

//   } catch (error: any) {
//     if (error.response) {
//       res.status(error.response.status).json({
//         success: false,
//         message: "Service error",
//         data: error.response.data
//       });
//     } else {
//       logger.error("API Gateway Proxy Error (Pharmacy):", {
//         message: error.message,
//         path: req.originalUrl,
//         requestId: (req as any).id,
//       });
//       res.status(503).json({
//         success: false,
//         message: "Service unavailable",
//       });
//     }
//   }
// };
