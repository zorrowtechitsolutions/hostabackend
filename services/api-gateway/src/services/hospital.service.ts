import { Request, Response, NextFunction } from "express";
import CircuitBreaker from "opossum";
import { httpClient } from "../utils/httpClient";
import { SERVICES } from "../config/services";
import { logger } from "../utils/logger";

const callHospitalService = async (options: any) => {
  return httpClient(options);
};

const breaker = new CircuitBreaker(callHospitalService, {
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 10000, 
});

breaker.fallback(() => {
  return { status: 503, data: { success: false, message: "hospital service temporarily unavailable" } };
});

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🛡️ Safe Path Mapping: Gateway /api/blood-bank -> Microservice /blood-bank
   
     const cleanedPath = req.originalUrl.replace("/api/hospital", "/hospital").replace("/api/prescription-template", "/prescription-template");
    const url = `${SERVICES.HOSPITAL_SERVICE}${cleanedPath}`;

    const options = {
      method: req.method,
      url: url,
      data: req.body,
      params: req.query,
      headers: {
        ...(() => {
          const { host, "content-length": contentLength, "transfer-encoding": transferEncoding, ...headers } = req.headers;
          return headers;
        })(),
        "X-Request-ID": (req as any).id || "gateway-internal",
      },
      validateStatus: (status: number) => true, // Handle all responses, don't throw on 4xx/5xx
    };

    const response: any = await breaker.fire(options);

    if (response.headers && response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    res.status(response.status).json(response.data);

  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: "hospital Service Error",
        data: error.response.data
      });
    } else {
      logger.error("API Gateway Proxy Error (hospital):", {
        message: error.message,
        path: req.originalUrl,
        requestId: (req as any).id,
      });
      res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
      });
    }
  }
};
