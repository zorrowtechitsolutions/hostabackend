
// import { Request, Response, NextFunction } from "express";
// import CircuitBreaker from "opossum";
// import { httpClient } from "../utils/httpClient";
// import { SERVICES } from "../config/services";
// import { logger } from "../utils/logger";

// const callLabService = async (options: any) => {
//   return httpClient(options);
// };

// const breaker = new CircuitBreaker(callLabService, {
//   timeout: 10000, 
//   errorThresholdPercentage: 50, 
//   resetTimeout: 10000, 
// });

// breaker.fallback(() => {
//   return { status: 503, data: { success: false, message: "lab service temporarily unavailable" } };
// });

// export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     // 🛡️ Safe Path Mapping: Gateway /api/blood-bank -> Microservice /blood-bank
//     const url = `${SERVICES.LAB_SERVICE}${req.originalUrl.replace("/api", "")}`;

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
//         "X-Request-ID": (req as any).id || "gateway-internal",
//       },
//       validateStatus: (status: number) => true, // Handle all responses, don't throw on 4xx/5xx
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
//         message: "lab Service Error",
//         data: error.response.data
//       });
//     } else {
//       logger.error("API Gateway Proxy Error (lab):", {
//         message: error.message,
//         path: req.originalUrl,
//         requestId: (req as any).id,
//       });
//       res.status(503).json({
//         success: false,
//         message: "Service temporarily unavailable",
//       });
//     }
//   }
// };
