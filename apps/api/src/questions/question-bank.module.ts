import { Module } from '@nestjs/common';
import { QuestionBankController, SelectionsController } from './question-bank.controller.js';
import { QuestionBankRepository } from './question-bank.repository.js';
import { QuestionBankService } from './question-bank.service.js';

@Module({
  controllers: [QuestionBankController, SelectionsController],
  providers: [QuestionBankRepository, QuestionBankService],
})
export class QuestionBankModule {}
