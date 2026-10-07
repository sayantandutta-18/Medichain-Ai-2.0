import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || (req.headers['x-request-id'] as string) || 'unknown';
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    requestId,
    statusCode: 404,
  });
}

export function centralErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || (req.headers['x-request-id'] as string) || 'unknown';

  let statusCode = 500;
  let message = 'An unexpected error occurred. Please try again later.';
  let errorName = 'InternalServerError';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorName = 'AppError';
  } else if (err instanceof ZodError) {
    statusCode = 400;
    errorName = 'ValidationError';
    message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  } else if (typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
    message = err.message || 'Request failed';
    errorName = err.name || 'HttpError';
  } else if (typeof err.status === 'number') {
    statusCode = err.status;
    message = err.message || 'Request failed';
    errorName = err.name || 'HttpError';
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = 400;
    errorName = 'BadRequest';
    message = 'Invalid JSON payload';
  }

  // Never return stack traces to clients (Master Rule 10)
  res.status(statusCode).json({
    error: errorName,
    message,
    requestId,
    statusCode,
  });
}
