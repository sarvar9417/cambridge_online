import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './database/client.js';
import { requireActiveAccount, requireAuth } from './middleware/auth.js';
import { PgAuthRepository } from './repositories/auth-repository.js';
import { PgClassesRepository, type ClassesRepository } from './repositories/classes-repository.js';
import { PgQuestionsRepository } from './repositories/questions-repository.js';
import { createAuthRouter } from './routes/auth.js';
import { createClassesRouter } from './routes/classes.js';
import { createQuestionsRouter } from './routes/questions.js';
import { createAssignmentsRouter } from './routes/assignments.js';
import { AssignmentsService } from './services/assignments-service.js';
import { createGradingRouter } from './routes/grading.js';
import { GradingService } from './services/grading-service.js';
import { createResultsRouter } from './routes/results.js';
import { ResultsService } from './services/results-service.js';
import { createIngestionRouter } from './routes/ingestion.js';
import { IngestionService } from './services/ingestion-service.js';
import { createAnalyticsRouter } from './routes/analytics.js';
import { AnalyticsService } from './services/analytics-service.js';
import { createExportsRouter } from './routes/exports.js';
import { ExportService } from './services/export-service.js';
import { createContentRouter } from './routes/content.js';
import { ContentService } from './services/content-service.js';
import { createJobsRouter } from './routes/jobs.js';
import { createAdminRouter } from './routes/admin.js';
import { AdminService } from './services/admin-service.js';
import { createEnrolmentRouter } from './routes/enrolment.js';
import { EnrolmentService } from './services/enrolment-service.js';
import { createSyllabusRouter } from './routes/syllabus.js';
import { SyllabusService } from './services/syllabus-service.js';
import { QuestionAuthoringService } from './services/question-authoring-service.js';
import { LatexError } from './lib/latex.js';
import { createPrivacyRouter } from './routes/privacy.js';
import { PrivacyService } from './services/privacy-service.js';
import { createReadyRouter, healthRouter } from './routes/health.js';
import { meRouter } from './routes/me.js';
import { AuthService } from './services/auth-service.js';
import { ZodError } from 'zod';
import { DomainError } from './services/assignments-service.js';

export function createApp(
  auth?: AuthService,
  classesRepository?: ClassesRepository,
  questionsRepository?: PgQuestionsRepository,
) {
  const app = express();
  const routeMounts: Array<{ path: string; public: boolean }> = [];
  app.locals.routeMounts = routeMounts;
  const mountPublic = (path: string, handler: express.RequestHandler) => {
    routeMounts.push({ path, public: true });
    app.use(path, handler);
  };
  const mountPrivate = (path: string, handler: express.RequestHandler) => {
    routeMounts.push({ path, public: false });
    app.use(path, handler);
  };

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  mountPublic('/api/v1/health', healthRouter);
  mountPublic(
    '/api/v1/ready',
    createReadyRouter(pool, {
      ai: Boolean(process.env.ANTHROPIC_API_KEY),
      pdfPrepare: Boolean(process.env.PDFTOTEXT_PATH && process.env.PDFTOPPM_PATH),
      durableStorage: Boolean(process.env.S3_BUCKET),
    }),
  );
  if (auth) {
    mountPublic('/api/v1/auth', createAuthRouter(auth));
  } else {
    const databaseUnavailable = (_req: express.Request, res: express.Response) => {
      res.status(503).json({
        error: { code: 'database_unavailable', message: "Ma'lumotlar bazasi ulanmagan." },
      });
    };
    app.post('/api/v1/auth/login', databaseUnavailable);
    app.post('/api/v1/auth/refresh', databaseUnavailable);
    app.post('/api/v1/auth/register', databaseUnavailable);
    app.post('/api/v1/auth/redeem-invite', databaseUnavailable);
  }

  app.use('/api/v1', requireAuth(auth));

  // `/auth/me` stays reachable for pending accounts so the frontend can render
  // the "waiting for your teacher" screen instead of a generic error.
  mountPrivate('/api/v1/auth/me', meRouter);
  app.use('/api/v1', requireActiveAccount);

  if (classesRepository) mountPrivate('/api/v1/classes', createClassesRouter(classesRepository));
  if (questionsRepository)
    mountPrivate(
      '/api/v1/questions',
      createQuestionsRouter(
        questionsRepository,
        pool ? new QuestionAuthoringService(pool) : undefined,
      ),
    );
  if (pool) mountPrivate('/api/v1/syllabus', createSyllabusRouter(new SyllabusService(pool)));
  if (pool)
    mountPrivate(
      '/api/v1/assignments',
      createAssignmentsRouter(new AssignmentsService(pool), pool),
    );
  if (pool) mountPrivate('/api/v1/grading', createGradingRouter(new GradingService(pool)));
  if (pool) mountPrivate('/api/v1/results', createResultsRouter(new ResultsService(pool)));
  if (pool) mountPrivate('/api/v1/ingestion', createIngestionRouter(new IngestionService(pool)));
  if (pool) mountPrivate('/api/v1/analytics', createAnalyticsRouter(new AnalyticsService(pool)));
  if (pool) mountPrivate('/api/v1/exports', createExportsRouter(new ExportService(pool), pool));
  if (pool) mountPrivate('/api/v1/content', createContentRouter(new ContentService(pool)));
  if (pool) mountPrivate('/api/v1/jobs', createJobsRouter(pool));
  if (pool) mountPrivate('/api/v1/admin', createAdminRouter(new AdminService(pool)));
  if (pool) mountPrivate('/api/v1/enrolment', createEnrolmentRouter(new EnrolmentService(pool)));
  if (pool) mountPrivate('/api/v1/privacy', createPrivacyRouter(new PrivacyService(pool)));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Manzil topilmadi.' } });
  });

  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // LaTeX problems carry per-finding detail so the authoring editor can put
      // the message next to the offending line instead of a generic "invalid".
      if (error instanceof LatexError) {
        res.status(error.status).json({
          error: {
            code: error.code,
            message: 'LaTeX matnida xato bor.',
            details: { field: error.field, findings: error.findings },
          },
        });
        return;
      }
      if (error instanceof DomainError) {
        const messages: Record<string, string> = {
          daily_export_limit: 'Bir kunda ko‘pi bilan 20 ta PDF tayyorlash mumkin.',
          invalid_idempotency_key: 'Idempotency-Key 8–200 belgidan iborat bo‘lishi kerak.',
          idempotency_conflict: 'Bu Idempotency-Key boshqa so‘rov uchun ishlatilgan.',
          idempotency_in_progress:
            'Ayni so‘rov hozir bajarilmoqda. Birozdan keyin qayta urinib ko‘ring.',
          owner_only: 'Bu amalni faqat owner bajaradi.',
          staff_only: 'Bu amal faqat o‘qituvchilar uchun.',
          not_found: 'Topilmadi.',
          group_name_taken: 'Bu nomdagi guruh allaqachon mavjud.',
          latex_body_required: 'LaTeX formatida savol matni yoki konteksti bo‘lishi shart.',
          primary_subtopic_not_selected: 'Asosiy subtopic tanlanganlar ichida bo‘lishi kerak.',
          diagram_asset_requires_svg: 'Diagramma uchun SVG chizma majburiy.',
          duplicate_mark_point_code: 'Mark point kodlari takrorlanmasligi kerak.',
          requires_unknown_mark_point: 'requires ro‘yxatida mavjud bo‘lmagan MP kodi bor.',
          unknown_group_label: 'Mark point mavjud bo‘lmagan guruhga tegishli.',
          mark_point_total_mismatch:
            'all_required sxemasida MP ballari yig‘indisi max_marks ga teng bo‘lishi kerak.',
          group_exceeds_max: 'Guruh balli sxema maksimumidan oshib ketdi.',
          group_needs_more_points: '“any N from M” guruhida MP soni N dan ko‘p bo‘lishi kerak.',
          mark_scheme_marks_mismatch: 'Mark scheme balli savol balliga mos emas.',
          question_path_taken: 'Bu paperda shu path allaqachon band.',
        };
        res
          .status(error.status)
          .json({ error: { code: error.code, message: messages[error.code] ?? error.message } });
        return;
      }
      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            code: 'validation_error',
            message: "Kiritilgan ma'lumot noto'g'ri.",
            details: error.flatten(),
          },
        });
        return;
      }
      console.error(error);
      res.status(500).json({ error: { code: 'internal_error', message: 'Ichki xato yuz berdi.' } });
    },
  );

  return app;
}

const auth = pool ? new AuthService(new PgAuthRepository(pool)) : undefined;
const classesRepository = pool ? new PgClassesRepository(pool) : undefined;
const questionsRepository = pool ? new PgQuestionsRepository(pool) : undefined;
export const app = createApp(auth, classesRepository, questionsRepository);
