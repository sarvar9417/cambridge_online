import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: "Kiritilgan ma'lumotlarni tekshiring.",
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
