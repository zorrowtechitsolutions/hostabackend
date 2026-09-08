import { Request, Response, NextFunction } from "express";
import CircuitBreaker from "opossum";
import { httpClient } from "../utils/httpClient";
import { SERVICES } from "../config/services";
import { logger } from "../utils/logger";

const callMedicineReminderService = async (options: any) => {
  return httpClient(options);
};

const breaker = new CircuitBreaker(callMedicineReminderService, {
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 10000, 
});

breaker.fallback(() => {
  return { status: 503, data: { success: false, message: "Medicine Reminder service temporarily unavailable" } };
});

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.path is the sub-path after "/medicine-reminder" was matched by the router
    // e.g. gateway: /api/medicine-reminder/register → req.path = /register
    // microservice: /medicinremainder/register
   
    const url = `${SERVICES.MEDICINREMINDER_SERVICE}${req.originalUrl.replace("/api/medicinremainder", "/medicinremainder")}`;


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
      validateStatus: (status: number) => true,
    };

    const response: any = await breaker.fire(options);

    // 🔥 Fix: Ensure we use the status code from the microservice response
    return res.status(response.status).json(response.data);

  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: "Medicine Reminder Service Error",
        data: error.response.data
      });
    } else {
      logger.error("API Gateway Proxy Error (medicine reminder):", {
        message: error.message,
        path: req.originalUrl,
      });
      return res.status(503).json({
        success: false,
        message: "Medicine Reminder service temporarily unavailable or unreachable",
      });
    }
  }
};

