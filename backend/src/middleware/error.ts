/**
 * Error-handling and async helpers.
 */
import { Request, Response, NextFunction } from 'express';

/** Wrap an async route handler so rejections are forwarded to next(). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Custom API error with a status code. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/** Final error handler — returns JSON. */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err?.status ?? 500;
  const message = err?.message ?? 'Internal server error';
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({ error: message });
}

/** 404 handler for unknown routes. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}
