import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validates a request body against a Zod schema and replaces it with the parsed
 * value, so a handler can never see a field the schema does not declare.
 *
 * Schemas live in `@campath/shared` and are reused by the web client, so a form
 * cannot build a body the API would reject.
 */
export function ZodBody<T extends ZodTypeAny>(schema: T): PipeTransform<unknown, z.infer<T>> {
  return {
    transform(value: unknown) {
      const result = schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException({
          error: {
            code: 'validation_error',
            message: "Kiritilgan ma'lumotlarni tekshiring.",
            details: result.error.flatten().fieldErrors,
          },
        });
      }
      return result.data;
    },
  };
}
