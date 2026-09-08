import { Request, Response, NextFunction } from "express";
import CircuitBreaker from "opossum";
import { httpClient } from "../utils/httpClient";
import { SERVICES } from "../config/services";
import { logger } from "../utils/logger";

const callBloodBankService = async (options: any) => {
  return httpClient(options);
};

const breaker = new CircuitBreaker(callBloodBankService, {
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 10000, 
});

breaker.fallback(() => {
  return { status: 503, data: { success: false, message: "Blood Bank service temporarily unavailable" } };
});

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🛡️ Safe Path Mapping: Gateway /api/stocks or /api/blood-bank -> Microservice /blood-bank/...
    let targetPath = req.originalUrl.replace("/api/blood-banks", "/blood-banks");
    if (!targetPath.startsWith("/blood-banks")) {
        targetPath = `/blood-banks${targetPath}`;
    }
    const url = `${SERVICES.BLOOD_BANK_SERVICE}${targetPath}`;

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
      validateStatus: (status: number) => status < 600,
    };

    const response: any = await breaker.fire(options);

    // 🔥 Fix: Ensure we use the status code from the microservice response
    // and return the data directly without extra wrapping
    return res.status(response.status).json(response.data);

  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: "Blood Bank Service Error",
        data: error.response.data
      });
    } else {
      logger.error("API Gateway Proxy Error (Blood Bank):", {
        message: error.message,
        path: req.originalUrl,
      });
      return res.status(503).json({
        success: false,
        message: "Blood Bank service temporarily unavailable or unreachable",
      });
    }
  }
};

