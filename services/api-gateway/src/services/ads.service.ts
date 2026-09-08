import { Request, Response } from "express";
import CircuitBreaker from "opossum";
import { httpClient } from "../utils/httpClient";
import { SERVICES } from "../config/services";

// Service call function
const calladsService = (options: any) => {
  return httpClient(options);
};

// Config for Circuit Breaker
const breakerOptions = {
    timeout: 10000, 
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
};

const breaker = new CircuitBreaker(calladsService, breakerOptions);

// Fallback for when the circuit is open
breaker.fallback(() => {
    return { 
        status: 503, 
        data: { success: false, message: "ads service temporarily unavailable" } 
    };
});

export const proxyRequest = async (req: Request, res: Response) => {
  try {
    const options = {
        method: req.method as any,
        url: `${SERVICES.ADS_SERVICE}${req.originalUrl.replace("/api", "")}`,
        data: req.body,
        headers: {
            ...(() => {
                const { host, "content-length": contentLength, "transfer-encoding": transferEncoding, ...headers } = req.headers;
                return headers;
            })(),
            "X-Request-ID": (req as any).id,
        },
        validateStatus: (status: number) => status < 600, // Handle 4xxx/5xxx manually
    };

    const response: any = await breaker.fire(options);

    if (response.headers && response.headers['set-cookie']) {
      res.setHeader('Set-Cookie', response.headers['set-cookie']);
    }

    res.status(response.status).json(response.data);

  } catch (error: any) {
    // If it's not a circuit breaker fallback, handle generic errors
    res.status(503).json({
        success: false,
        message: "Service unavailable",
        error: { code: "SERVICE_ERROR", details: null }
    });
  }
};
