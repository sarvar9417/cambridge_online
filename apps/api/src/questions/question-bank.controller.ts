import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Actor } from '@campath/shared';
import { z } from 'zod';
import { Roles } from '../common/roles.decorator.js';
import { ZodBody } from '../common/zod.pipe.js';
import { QuestionBankService } from './question-bank.service.js';
import type { QuestionBankFilters } from './question-bank.types.js';

type ActorRequest = Request & { actor: Actor };
const array = (value: unknown) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const optionalBoolean = z.preprocess(
  (value) => (value === undefined ? undefined : value === true || value === 'true'),
  z.boolean().optional(),
);
const querySchema = z.object({
  view: z.enum(['parts', 'families']).default('parts'),
  component: z.coerce.number().int().positive().optional(),
  topicIds: z.preprocess(array, z.array(z.string().uuid())).default([]),
  subtopicIds: z.preprocess(array, z.array(z.string().uuid())).default([]),
  commandWords: z.preprocess(array, z.array(z.string())).default([]),
  marksMin: z.coerce.number().int().nonnegative().optional(),
  marksMax: z.coerce.number().int().nonnegative().optional(),
  aos: z.preprocess(array, z.array(z.string())).default([]),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  series: z.preprocess(array, z.array(z.string())).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  hasDiagram: optionalBoolean,
  status: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  unusedInClassId: z.string().uuid().optional(),
  dependency: z.enum(['independent', 'any']).default('any'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
const createSchema = z.object({ name: z.string().trim().min(1).max(120) });
const addSchema = z.object({
  questionId: z.string().uuid(),
  role: z.enum(['graded', 'context_only']).default('graded'),
});
const roleSchema = z.object({ role: z.enum(['graded', 'context_only']) });

@Controller('questions')
@Roles('owner', 'teacher')
export class QuestionBankController {
  constructor(private readonly service: QuestionBankService) {}

  @Get()
  list(@Req() request: ActorRequest, @Query() raw: unknown) {
    const parsed = querySchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException({
        error: {
          code: 'validation_error',
          message: 'Filtrlarni tekshiring.',
          details: parsed.error.flatten().fieldErrors,
        },
      });
    return this.service.list(request.actor, parsed.data as QuestionBankFilters);
  }

  @Get('filter-options')
  options(@Req() request: ActorRequest) {
    return this.service.filterOptions(request.actor);
  }

  @Get(':id/portable')
  portable(@Req() request: ActorRequest, @Param('id') id: string) {
    return this.service.portable(request.actor, id);
  }
}

@Controller('selections')
@Roles('owner', 'teacher')
export class SelectionsController {
  constructor(private readonly service: QuestionBankService) {}

  @Get()
  list(@Req() request: ActorRequest) {
    return this.service.listSelections(request.actor);
  }

  @Post()
  create(
    @Req() request: ActorRequest,
    @Body(ZodBody(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    return this.service.createSelection(request.actor, body.name);
  }

  @Get(':id')
  get(@Req() request: ActorRequest, @Param('id') id: string) {
    return this.service.selection(request.actor, id);
  }

  @Post(':id/items')
  add(
    @Req() request: ActorRequest,
    @Param('id') id: string,
    @Body(ZodBody(addSchema)) body: z.infer<typeof addSchema>,
  ) {
    return this.service.addItem(request.actor, id, body.questionId, body.role);
  }

  @Patch(':id/items/:itemId')
  update(
    @Req() request: ActorRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(ZodBody(roleSchema)) body: z.infer<typeof roleSchema>,
  ) {
    return this.service.updateItem(request.actor, id, itemId, body.role);
  }

  @Delete(':id/items/:itemId')
  async remove(
    @Req() request: ActorRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    await this.service.removeItem(request.actor, id, itemId);
    return { ok: true };
  }
}
