import { Injectable } from '@nestjs/common';
import type { Actor } from '@campath/shared';
import { QuestionBankRepository } from './question-bank.repository.js';
import type { QuestionBankFilters, SelectionRole } from './question-bank.types.js';
import { buildSelectionReview } from './selection-review.js';

@Injectable()
export class QuestionBankService {
  constructor(private readonly repository: QuestionBankRepository) {}

  list(actor: Actor, filters: QuestionBankFilters) {
    return this.repository.list(actor, filters);
  }

  filterOptions(actor: Actor) {
    return this.repository.filterOptions(actor);
  }

  portable(actor: Actor, id: string) {
    return this.repository.portable(actor, id);
  }

  listSelections(actor: Actor) {
    return this.repository.listSelections(actor);
  }

  createSelection(actor: Actor, name: string) {
    return this.repository.createSelection(actor, name);
  }

  async selection(actor: Actor, id: string) {
    return buildSelectionReview(await this.repository.selectionItems(actor, id));
  }

  addItem(actor: Actor, selectionId: string, questionId: string, role: SelectionRole) {
    return this.repository.addSelectionItem(actor, selectionId, questionId, role);
  }

  updateItem(actor: Actor, selectionId: string, itemId: string, role: SelectionRole) {
    return this.repository.updateSelectionItem(actor, selectionId, itemId, role);
  }

  removeItem(actor: Actor, selectionId: string, itemId: string) {
    return this.repository.removeSelectionItem(actor, selectionId, itemId);
  }
}
