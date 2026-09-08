import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import axios from 'axios';
import { env } from '../config/env';

// Initialize Redis Client
const redisClient = createClient({
  url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().catch(console.error);

export const authAndMembershipMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token, just pass through. Individual services will reject if it's an authenticated route.
    // Or we could enforce authentication here for specific routes, but the gateway shouldn't know all routes.
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "supersecretjwtkey");

    // Task 3: Selection Token Restriction
    if (decoded.isSelectionToken) {
      if (!req.path.includes('/select-hospital')) {
        res.status(403).json({ success: false, message: 'This temporary token is only valid for selecting a hospital.' });
        return;
      }
      // If it is the selection endpoint, allow it through
      req.headers['x-user-data'] = JSON.stringify(decoded);
      return next();
    }

    if (decoded.isRefresh) {
        res.status(401).json({ success: false, message: 'Invalid token' });
        return;
    }

    // Task 4: Global Membership Verification Middleware
    if (decoded.role === 'doctor' || decoded.role === 'staff') {
      const { id: authId, hospitalId, doctorId, staffId } = decoded;

      if (!hospitalId) {
        res.status(403).json({ success: false, message: 'No hospital selected in token.' });
        return;
      }

      const cacheKey = `membership:${decoded.role}:${decoded.role === 'doctor' ? doctorId : staffId}:${hospitalId}`;
      // Guard: only query Redis if the connection is established
      const cachedStatus = redisClient.isReady ? await redisClient.get(cacheKey) : null;

      if (cachedStatus === 'ACTIVE') {
        req.headers['x-user-data'] = JSON.stringify(decoded);
        return next();
      } else if (cachedStatus) {
         // cached as inactive or something else
         res.status(403).json({ success: false, message: 'Hospital membership is not active.' });
         return;
      }

      // Cache miss, verify with respective service
      try {
        let isActive = false;
        if (decoded.role === 'doctor') {
          const resHosp = await axios.get(`${process.env.DOCTOR_SERVICE_URL}/doctor/internal/${doctorId}/hospitals`, {
            headers: { 'x-service-secret': process.env.INTERNAL_SERVICE_SECRET },
            timeout: 3000,
          });
          const memberships = resHosp.data?.data || [];
          const chosen = memberships.find((m: any) => m.hospitalId === hospitalId);
          if (chosen && chosen.status === 'ACTIVE') isActive = true;
        // } else if (decoded.role === 'staff') {
        //   const resHosp = await axios.get(`${process.env.STAFF_SERVICE_URL}/staff/internal/${staffId}/hospitals`, {
        //     headers: { 'x-service-secret': process.env.INTERNAL_SERVICE_SECRET },
        //     timeout: 3000,
        //   });
        //   const memberships = resHosp.data?.data || [];
        //   const chosen = memberships.find((m: any) => m.hospitalId === hospitalId);
        //   if (chosen && chosen.status === 'ACTIVE') isActive = true;
        // }



        } else if (decoded.role === 'staff') {

  console.log("========== STAFF MEMBERSHIP DEBUG ==========");
  console.log("decoded:", decoded);
  console.log("staffId:", staffId);
  console.log("hospitalId:", hospitalId);
  console.log("STAFF_SERVICE_URL:", process.env.STAFF_SERVICE_URL);
  console.log(
    "URL:",
    `${process.env.STAFF_SERVICE_URL}/staff/internal/${staffId}/hospitals`
  );
  console.log("============================================");

  const resHosp = await axios.get(
    `${process.env.STAFF_SERVICE_URL}/staff/internal/${staffId}/hospitals`,
    {
      headers: {
        'x-service-secret': process.env.INTERNAL_SERVICE_SECRET
      },
      timeout: 3000,
    }
  );

  console.log("Staff service status:", resHosp.status);
  console.log("Staff service response:", JSON.stringify(resHosp.data, null, 2));

  const memberships = resHosp.data?.data || [];

  console.log("Memberships:", memberships);
  console.log("Requested hospitalId:", hospitalId);
  console.log(
    "Membership hospitalIds:",
    memberships.map((m: any) => ({
      hospitalId: m.hospitalId,
      type: typeof m.hospitalId,
      status: m.status
    }))
  );

  const chosen = memberships.find(
    (m: any) =>
      Number(m.hospitalId) === Number(hospitalId) &&
      m.status === 'ACTIVE'
  );

  console.log("Chosen membership:", chosen);

  if (chosen) {
    isActive = true;
  }

  console.log("isActive:", isActive);
}

        if (isActive) {
          // Cache for 5 minutes
          await redisClient.setEx(cacheKey, 300, 'ACTIVE');
          req.headers['x-user-data'] = JSON.stringify(decoded);
          return next();
        } else {
          await redisClient.setEx(cacheKey, 300, 'INACTIVE');
          res.status(403).json({ success: false, message: 'Hospital membership is not active.' });
          return;
        }
      } catch (err: any) {
        console.error('Failed to verify membership (transient error, failing open):', err.message);
        // Fail open on transient errors (timeout, service not ready).
        // The downstream service will enforce its own auth if needed.
        req.headers['x-user-data'] = JSON.stringify(decoded);
        return next();
      }
    }

    // For hospital and superadmin, pass through
    req.headers['x-user-data'] = JSON.stringify(decoded);
    return next();
  } catch (error) {
    // We don't reject here because the underlying service might not require auth for this route.
    // If the route DOES require auth, the underlying service will fail it.
    // WAIT! If it has a token but it's expired/invalid, we SHOULD reject it, or else the service might see no token or an invalid token.
    // Let's reject if token is provided but invalid.
    res.status(401).json({ success: false, message: 'Token is invalid or expired' });
    return;
  }
};
