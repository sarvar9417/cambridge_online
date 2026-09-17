import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const app=source('src/app.ts');
const builder=source('src/services/live-exam-builder-service.ts');
const builderRoute=source('src/routes/live-exam-builder.ts');
const board=source('src/services/live-exam-board-service.ts');
const boardRoute=source('src/routes/live-exam-board.ts');

describe('Live Challenge convergence contract',()=>{
  it('keeps the existing Live Exam namespace as the one canonical API surface',()=>{
    expect(app).toContain("'/api/v1/live-exams'");
    expect(app).toContain('createLiveExamBuilderRouter');
    expect(app).toContain('createLiveExamBoardRouter');
    expect(app).toContain('createLiveExamsRouter');
    expect(app.indexOf('createLiveExamBuilderRouter(new LiveExamBuilderService(pool))'))
      .toBeLessThan(app.indexOf('createLiveExamsRouter(new LiveExamService'));
  });

  it('keeps builder reads staff-only, source-complete and current-syllabus compatible',()=>{
    expect(builder).toContain("if (actor.role === 'student') throw new DomainError('staff_only', 403)");
    expect(builder).toContain("q.status='approved'::review_status");
    expect(builder).toContain("ms.status='approved'::review_status");
    expect(builder).toContain('question_source_occurrences occ');
    expect(builder).toContain("q.content_version=1 and q.content_json is not null");
    expect(builder).toContain('learning_objective_compatibility compat');
    expect(builder).toContain("compat.relation in ('equivalent','subtopic_compatible')");
    expect(builder).toContain('not exists(select 1 from question_dependencies qd where qd.question_id=q.id)');
    expect(builderRoute).toContain("res.set('Cache-Control', 'private, no-store')");
  });

  it('keeps the projector on an explicit learner-safe allow-list',()=>{
    expect(board).toContain("if (actor.role === 'student') throw new DomainError('staff_only', 403)");
    expect(board).toContain("joinCode: session.status === 'lobby' ? session.joinCode : null");
    expect(board).toContain("const reveal = ['marking','review','finished'].includes(String(session.status));");
    expect(board).not.toContain('teacherAnswers:');
    expect(board).not.toContain('participants:');
    expect(board).not.toContain('ownAnswer:');
    expect(boardRoute).toContain("res.set('Cache-Control', 'private, no-store')");
  });
});
