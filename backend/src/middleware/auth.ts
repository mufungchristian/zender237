/**
 * Authentication & authorization middleware.
 *
 * Issues JWT tokens on login and verifies them on protected routes.
 * Tokens are bearer tokens in the Authorization header.
 */
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { getStore } from '../db';
import { toSafeUser } from '../db/memoryStore';
import type { SafeUser, UserRole } from '../types';

/** Extend Express Request with the authenticated user. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
      userId?: number;
    }
  }
}

export interface JwtPayload {
  sub: number; // user id
  role: UserRole;
  phone: string;
}

/** Sign a JWT for a user. */
export function signToken(user: { id: number; role: UserRole; phone: string }): string {
  const payload: JwtPayload = { sub: user.id, role: user.role, phone: user.phone };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

/** Verify a token and return its payload (throws on invalid). */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as unknown as JwtPayload;
}

/** Extract the bearer token from the Authorization header. */
function extractToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/** Middleware: require a valid JWT. Loads the user from the store. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const payload = verifyToken(token);
    const user = await getStore().findUserById(payload.sub);
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }
    req.user = toSafeUser(user);
    req.userId = user.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Middleware: require one of the given roles (use after requireAuth). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/** Convenience: require admin role. */
export const requireAdmin = requireRole('admin');
/** Convenience: require staff or admin. */
export const requireStaff = requireRole('staff', 'admin');
