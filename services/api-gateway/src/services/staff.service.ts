import { Request, Response, NextFunction } from "express";
import CircuitBreaker from "opossum";
import { httpClient } from "../utils/httpClient";
import { SERVICES } from "../config/services";
import { logger } from "../utils/logger";

const callStaffService = async (options: any) => {
  return httpClient(options);
};

const breaker = new CircuitBreaker(callStaffService, {
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 10000,
});

breaker.fallback(() => {
  return { status: 503, data: { success: false, message: "Staff service temporarily unavailable" } };
});

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🛡️ Safe Path Mapping: Gateway /api/staff -> Microservice /staff
    const targetPath = req.originalUrl.replace("/api", "");
    const url = `${SERVICES.STAFF_SERVICE}${targetPath}`;

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

    if (response.headers && response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    // 🔥 Fix: Ensure we use the status code from the microservice response
    return res.status(response.status).json(response.data);

  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: "Staff Service Error",
        data: error.response.data
      });
    } else {
      logger.error("API Gateway Proxy Error (Staff):", {
        message: error.message,
        path: req.originalUrl,
      });
      return res.status(503).json({
        success: false,
        message: "Staff service temporarily unavailable or unreachable",
      });
    }
  }
};
