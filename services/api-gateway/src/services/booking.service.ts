import { Request, Response, NextFunction } from "express";
import CircuitBreaker from "opossum";
import { httpClient } from "../utils/httpClient";
import { SERVICES } from "../config/services";
import { logger } from "../utils/logger";

const callBookingService = async (options: any) => {
  return httpClient(options);
};

const breaker = new CircuitBreaker(callBookingService, {
  timeout: 10000, 
  errorThresholdPercentage: 50, 
  resetTimeout: 10000, 
});

breaker.fallback(() => {
  return { status: 503, data: { success: false, message: "booking service temporarily unavailable" } };
});

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🛡️ Safe Path Mapping: Gateway /api/hospital/:hospitalId/booking -> Microservice /hospital/:hospitalId/booking
    // We remove '/api' from the original URL so /api/hospital/1/booking/register becomes /hospital/1/booking/register
    const targetPath = req.originalUrl.replace("/api", "");
    const url = `${SERVICES.BOOKING_SERVICE}${targetPath}`;

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

    return res.status(response.status).json(response.data);

  } catch (error: any) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: "Booking Service Error",
        data: error.response.data
      });
    } else {
      logger.error("API Gateway Proxy Error (Booking):", {
        message: error.message,
        path: req.originalUrl,
      });
      return res.status(503).json({
        success: false,
        message: "Booking service temporarily unavailable or unreachable",
      });
    }
  }
};
