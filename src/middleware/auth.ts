import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: TokenPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: 'Token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};
