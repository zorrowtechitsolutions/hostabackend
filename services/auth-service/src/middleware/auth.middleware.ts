import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

const getJwtSecret = (): string | undefined => {
  const secret = process.env.JWT_SECRET;
  return secret && secret.trim() ? secret : undefined;
};

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided, authorization denied' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = getJwtSecret();

  if (!jwtSecret) {
    console.error('JWT secret is not configured');
    res.status(500).json({ message: 'Authentication configuration error' });
    return;
  }

  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    
    if (decoded.isSelectionToken) {
      if (!req.path.includes('/select-hospital')) {
        res.status(403).json({ message: 'This temporary token is only valid for selecting a hospital.' });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({ message: 'Token has expired' });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({ message: 'Token is not valid' });
      return;
    }

    console.error('Unexpected authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

export const verifyInternalRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = req.headers['x-service-secret'];
  const receivedSecret = typeof secret === 'string' ? secret : '';
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  if (!expectedSecret) {
    console.error('Internal service secret is not configured');
    return res.status(500).json({
      success: false,
      message: 'Internal service configuration error',
    });
  }

  if (receivedSecret !== expectedSecret) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
    });
  }

  next();
};

export const checkPermission = (resource: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    next();
  };
};