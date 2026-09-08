import axios from "axios";
import axiosRetry from "axios-retry";

export const httpClient = axios.create({
  timeout: 10000, // 10 seconds timeout
});

// Configure retry mechanism
axiosRetry(httpClient, {
  retries: 1, // Reduced to 1 to avoid long hanging requests during failures
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // ONLY retry on network/connection errors. 
    // Do NOT retry on 5xx because these are usually logic/DB errors that will fail again.
    return axiosRetry.isNetworkError(error);
  },
});

