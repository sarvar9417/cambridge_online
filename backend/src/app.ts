import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './database/client.js';
import { requireAuth } from './middleware/auth.js';
import { PgAuthRepository, type AuthRepository } from './repositories/auth-repository.js';
import { createMailer } from './lib/email/mailer.js';
import { createAdminUsersRouter } from './routes/admin-users.js';
import { createOverviewRouter } from './routes/overview.js';
import { createCorpusRouter } from './routes/corpus.js';
import { createSystemRouter } from './routes/system.js';
import { createQualityRouter } from './routes/quality.js';
import { QualityService } from './services/quality-service.js';
import { SystemService } from './services/system-service.js';
import { CorpusService } from './services/corpus-service.js';
import { OverviewService } from './services/overview-service.js';
import { AdminUsersService } from './services/admin-users-service.js';
import { PgClassesRepository, type ClassesRepository } from './repositories/classes-repository.js';
import { PgQuestionsRepository } from './repositories/questions-repository.js';
import { PgStaffAwareQuestionsRepository } from './repositories/staff-aware-questions-repository.js';
import { PgSelectionsRepository } from './repositories/selections-repository.js';
import { createAuthRouter } from './routes/auth.js';
import { createClassesRouter } from './routes/classes.js';
import { createClassesAdminRouter } from './routes/classes-admin.js';
import { ClassesService } from './services/classes-service.js';
import { createQuestionsRouter } from './routes/questions.js';
import { createLessonCheckpointsRouter } from './routes/lesson-checkpoints.js';
import { LessonCheckpointService } from './services/lesson-checkpoint-service.js';
import { createSelectionsRouter } from './routes/selections.js';
import { createAssignmentsRouter } from './routes/assignments.js';
import { AssignmentsService } from './services/assignments-service.js';
import { SelectionAssignmentService } from './services/selection-assignment-service.js';
import { createLiveChallengesRouter } from './routes/live-challenges.js';
import { LiveChallengeService } from './services/live-challenge-service.js';
import { LiveChallengeSessionService } from './services/live-challenge-session-service.js';
import { LiveChallengeAnswerService } from './services/live-challenge-answer-service.js';
import { LiveChallengePeerMarkingService } from './services/live-challenge-peer-marking-service.js';
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
import { createPrivacyRouter } from './routes/privacy.js';
import { createSubmissionsRouter } from './routes/submissions.js';
import { createGradingsRouter } from './routes/gradings.js';
import { PrivacyService } from './services/privacy-service.js';
import { createReadyRouter, healthRouter } from './routes/health.js';
import { createMeRouter } from './routes/me.js';
import { AuthService } from './services/auth-service.js';
import { ZodError } from 'zod';
import { DomainError } from './services/assignments-service.js';
import { opportunisticMaintenance } from './middleware/opportunistic-maintenance.js';
import { createQuestionVisualFidelityMiddleware } from './middleware/question-visual-fidelity.js';
import { isDatabaseUnavailable } from './lib/database-unavailable.js';
import { SupabaseAssetStore, type AssetUrlSigner } from './jobs/asset-store.js';

export function createApp(
  auth?: AuthService,
  classesRepository?: ClassesRepository,
  questionsRepository?: PgQuestionsRepository,
  authRepository?: AuthRepository,
  assetUrlSigner?: AssetUrlSigner,
  adminUsersService?: AdminUsersService,
) {
  const app = express();
  const routeMounts: Array<{ path:string; public:boolean }> = [];
  app.locals.routeMounts = routeMounts;
  const mountPublic = (path:string, handler:express.RequestHandler) => { routeMounts.push({path,public:true}); app.use(path,handler); };
  const mountPrivate = (path:string, handler:express.RequestHandler) => { routeMounts.push({path,public:false}); app.use(path,handler); };

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  mountPublic('/api/v1/health', healthRouter);
  mountPublic('/api/v1/ready', createReadyRouter(pool, {
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    pdfPrepare: Boolean(process.env.PDFTOTEXT_PATH && process.env.PDFTOPPM_PATH),
    durableStorage: Boolean(process.env.S3_BUCKET || (config.SUPABASE_URL && config.SUPABASE_STORAGE_SECRET_KEY)),
  }));
  if (auth) {
    mountPublic('/api/v1/auth', createAuthRouter(auth));
  } else {
    const databaseUnavailable = (_req: express.Request, res: express.Response) => {
      res.status(503).json({ error: { code: 'database_unavailable', message: "Ma'lumotlar bazasi ulanmagan." } });
    };
    const unavailableAuth = express.Router();
    unavailableAuth.post('/login', databaseUnavailable);
    unavailableAuth.post('/refresh', databaseUnavailable);
    unavailableAuth.post('/redeem-invite', databaseUnavailable);
    unavailableAuth.post('/register', databaseUnavailable);
    unavailableAuth.post('/password/forgot', databaseUnavailable);
    unavailableAuth.post('/password/reset', databaseUnavailable);
    mountPublic('/api/v1/auth', unavailableAuth);
  }

  app.use('/api/v1', requireAuth(auth));
  const maintenancePool=pool;if(maintenancePool)app.use('/api/v1',opportunisticMaintenance(()=>new AssignmentsService(maintenancePool).closeExpired(20)));
  const assignmentsService=pool?new AssignmentsService(pool,assetUrlSigner):undefined;
  const selectionsRepository = pool && questionsRepository ? new PgSelectionsRepository(pool, questionsRepository) : undefined;
  const questionVisualFidelity = pool ? createQuestionVisualFidelityMiddleware(pool) : undefined;
  if (questionVisualFidelity) {
    app.use('/api/v1/questions', questionVisualFidelity);
    app.use('/api/v1/selections', questionVisualFidelity);
  }
  if(auth) mountPrivate('/api/v1/auth/me', createMeRouter(auth));
  if (pool) mountPrivate('/api/v1/classes', createClassesAdminRouter(new ClassesService(pool)));
  if (classesRepository) mountPrivate('/api/v1/classes', createClassesRouter(classesRepository,assignmentsService));
  if (questionsRepository) mountPrivate('/api/v1/questions', createQuestionsRouter(questionsRepository));
  if (pool) mountPrivate('/api/v1/lesson-checkpoints', createLessonCheckpointsRouter(new LessonCheckpointService(pool,assetUrlSigner)));
  if (pool && selectionsRepository) mountPrivate('/api/v1/selections', createSelectionsRouter(selectionsRepository,new SelectionAssignmentService(pool,selectionsRepository),pool));
  if (pool) mountPrivate('/api/v1/live-challenges', createLiveChallengesRouter(
    new LiveChallengeService(pool),
    new LiveChallengeSessionService(pool,assetUrlSigner),
    new LiveChallengeAnswerService(pool),
    new LiveChallengePeerMarkingService(pool),
  ));
  if (assignmentsService) mountPrivate('/api/v1/assignments', createAssignmentsRouter(assignmentsService,pool!));
  if (assignmentsService) mountPrivate('/api/v1/submissions', createSubmissionsRouter(assignmentsService));
  if (pool) mountPrivate('/api/v1/grading', createGradingRouter(new GradingService(pool)));
  if (pool) mountPrivate('/api/v1/gradings', createGradingsRouter(new GradingService(pool)));
  if (pool) mountPrivate('/api/v1/results', createResultsRouter(new ResultsService(pool,assetUrlSigner)));
  if (pool) mountPrivate('/api/v1/ingestion', createIngestionRouter(new IngestionService(pool)));
  if (pool) mountPrivate('/api/v1/analytics', createAnalyticsRouter(new AnalyticsService(pool)));
  if (pool) mountPrivate('/api/v1/exports', createExportsRouter(new ExportService(pool),pool));
  if (pool) mountPrivate('/api/v1/content', createContentRouter(new ContentService(pool)));
  if (pool) mountPrivate('/api/v1/jobs', createJobsRouter(pool));
  if (auth && authRepository) mountPrivate(
    '/api/v1/admin/users',
    createAdminUsersRouter(auth, authRepository, adminUsersService),
  );
  if (pool) mountPrivate('/api/v1/admin/overview', createOverviewRouter(new OverviewService(pool)));
  if (pool) mountPrivate('/api/v1/admin/corpus', createCorpusRouter(new CorpusService(pool)));
  if (pool) mountPrivate('/api/v1/admin/system', createSystemRouter(new SystemService(pool)));
  if (pool) mountPrivate('/api/v1/admin/quality', createQualityRouter(new QualityService(pool)));
  if (pool) mountPrivate('/api/v1/admin', createAdminRouter(new AdminService(pool)));
  if (pool) mountPrivate('/api/v1/privacy', createPrivacyRouter(new PrivacyService(pool)));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Manzil topilmadi.' } });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof DomainError) {
      const messages:Record<string,string>={daily_export_limit:'Bir kunda ko‘pi bilan 20 ta PDF tayyorlash mumkin.',invalid_idempotency_key:'Idempotency-Key 8–200 belgidan iborat bo‘lishi kerak.',idempotency_conflict:'Bu Idempotency-Key boshqa so‘rov uchun ishlatilgan.',idempotency_in_progress:'Ayni so‘rov hozir bajarilmoqda. Birozdan keyin qayta urinib ko‘ring.',practice_pool_empty:'Bu mavzu uchun tasdiqlangan mashq savollari hali yo‘q.',appeal_exists:'Bu savol bo‘yicha apellyatsiya yuborilgan.',appeal_limit:'Bir vazifa uchun ko‘pi bilan 3 ta apellyatsiya yuborish mumkin.',selection_dependencies_unresolved:'Tanlovdagi majburiy dependencylar hal qilinmagan.',selection_changed:'Tanlov yaratish vaqtida o‘zgardi. Qayta ko‘rib chiqing.',online_asset_rendering_unavailable:'Tanlovda student oynasida hali ko‘rsatilmaydigan diagramma yoki rasm bor. Avval asset renderingni yakunlang.',pdf_asset_embedding_unavailable:'Tanlovda PDF ichiga hali embed qilinmaydigan diagramma yoki rasm bor. Incomplete PDF yaratilmadi.',live_challenge_class_syllabus_mismatch:'Tanlangan sinf boshqa syllabusga biriktirilgan.',live_challenge_invalid_taxonomy:'Syllabus, chapter yoki section mos emas.',live_challenge_questions_ineligible:'Tanlangan savollardan kamida bittasi Live Challenge uchun source-complete emas.',live_challenge_pool_insufficient:'Bu section uchun yetarli eligible Cambridge savoli yo‘q.',live_challenge_questions_required:'Challenge publish qilish uchun kamida bitta savol kerak.',live_challenge_not_draft:'Faqat draft challenge tahrirlanadi.',live_challenge_duplicate_question:'Bir savolni challenge ichida takrorlab bo‘lmaydi.',live_challenge_invalid_time_limit:'Savol vaqti 10–7200 soniya oralig‘ida bo‘lishi kerak.',live_challenge_join_code_unavailable:'Unique join code yaratib bo‘lmadi. Qayta urinib ko‘ring.',live_challenge_invalid_join_code:'Join code 6 ta harf yoki raqamdan iborat bo‘lishi kerak.',live_challenge_join_not_found:'Bu kod bilan sizning sinfingizga tegishli ochiq challenge topilmadi.',live_challenge_join_closed:'Bu challenge hozir yangi ishtirokchilarni qabul qilmaydi.',live_challenge_removed:'Siz bu challenge’dan o‘qituvchi tomonidan chiqarilgansiz.',live_challenge_leave_closed:'Challenge boshlanganidan keyin lobby’dan chiqib bo‘lmaydi.',live_challenge_lobby_unavailable:'Waiting room bu holatda ochilmaydi.',live_challenge_invalid_transition:'Challenge holatini bu tarzda o‘zgartirib bo‘lmaydi.',live_challenge_state_conflict:'Challenge holati boshqa oynada o‘zgargan. Yangilab qayta urinib ko‘ring.',live_challenge_not_joined:'Bu challenge savollarini ko‘rish uchun avval sinfingiz orqali join qiling.',live_challenge_round_unavailable:'Challenge’ning joriy round savoli topilmadi.',live_challenge_question_assets_unavailable:'Savolning diagramma yoki rasmi xavfsiz yuklanmadi. Challenge savoli to‘liq ko‘rsatilmaguncha davom etib bo‘lmaydi.',live_challenge_answer_round_unavailable:'Challenge’ning faol roundi topilmadi.',live_challenge_answer_required:'Javob bo‘sh bo‘lishi mumkin emas.',live_challenge_answer_closed:'Bu savol uchun javob qabul qilish yopilgan.',live_challenge_answer_already_submitted:'Bu round uchun javob allaqachon topshirilgan va endi o‘zgartirib bo‘lmaydi.',live_challenge_peer_round_unavailable:'Peer marking uchun joriy round topilmadi.',live_challenge_peer_marking_disabled:'Bu challenge uchun peer marking o‘chirilgan.',live_challenge_peer_assignment_unavailable:'Anonymous peer assignmentni xavfsiz tuzib bo‘lmadi. Kamida 2 ta topshirilgan javob kerak.',live_challenge_peer_marking_not_open:'Peer marking hali ochilmagan yoki allaqachon yopilgan.',live_challenge_mark_scheme_unavailable:'Tasdiqlangan Mark Scheme snapshot topilmadi.',live_challenge_peer_score_invalid:'Berilgan ball savolning maksimal ballidan tashqarida.',live_challenge_peer_mark_point_invalid:'Tanlangan Mark Scheme bandlaridan biri bu savolga tegishli emas.',live_challenge_peer_marks_incomplete:'Barcha peer marklar topshirilmaguncha round natijasini chiqarib bo‘lmaydi.',live_challenge_result_unavailable:'Bu round natijasi hali chiqarilmagan.'};
      res.status(error.status).json({ error: { code: error.code, message: messages[error.code]??error.message } });
      return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'validation_error', message: 'Kiritilgan ma\'lumot noto\'g\'ri.', details: error.flatten() } });
      return;
    }
    if (isDatabaseUnavailable(error)) {
      console.error('Database unavailable', error);
      res.status(503).json({
        error: {
          code: 'database_unavailable',
          message: 'Ma’lumotlar bazasiga ulanib bo‘lmadi. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.',
        },
      });
      return;
    }
    console.error(error);
    res.status(500).json({ error: { code: 'internal_error', message: 'Ichki xato yuz berdi.' } });
  });

  return app;
}

const authRepository = pool ? new PgAuthRepository(pool) : undefined;
const auth = authRepository ? new AuthService(authRepository, createMailer(config)) : undefined;
const classesRepository = pool ? new PgClassesRepository(pool) : undefined;
const assetSigner = config.SUPABASE_URL && config.SUPABASE_STORAGE_SECRET_KEY
  ? new SupabaseAssetStore({
      url: config.SUPABASE_URL,
      secretKey: config.SUPABASE_STORAGE_SECRET_KEY,
      bucket: config.ASSET_STORAGE_BUCKET,
    })
  : undefined;
const questionsRepository = pool ? new PgStaffAwareQuestionsRepository(pool, assetSigner) : undefined;
const adminUsersService = pool ? new AdminUsersService(pool) : undefined;
export const app = createApp(
  auth,
  classesRepository,
  questionsRepository,
  authRepository,
  assetSigner,
  adminUsersService,
);
