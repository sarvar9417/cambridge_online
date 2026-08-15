import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../services/auth-service.js';
import type { Actor } from '../lib/actor.js';
import type { Pool } from 'pg';
import { isDatabaseUnavailable } from '../lib/database-unavailable.js';

export function requireAuth(auth?: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const [kind, token] = req.header('authorization')?.split(' ') ?? [];
    if (kind !== 'Bearer' || !token) {
      res.status(401).json({ error: { code: 'unauthorized', message: 'Kirish talab qilinadi.' } });
      return;
    }

    if (!auth) {
      res.status(503).json({ error: { code: 'database_unavailable', message: "Ma'lumotlar bazasi ulanmagan." } });
      return;
    }

    try {
      req.actor = await auth.verifyAccessToken(token);
      next();
    } catch (error) {
      // Verifying a token reads the user row, so an unreachable database looks
      // exactly like a bad token from here. Answering 401 would make the client
      // try to refresh, fail again, and sign the user out -- a database blip
      // would log out everyone who happened to be working.
      if (isDatabaseUnavailable(error)) {
        res.status(503).json({
          error: {
            code: 'database_unavailable',
            message: 'Ma’lumotlar bazasiga ulanib bo‘lmadi. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.',
          },
        });
        return;
      }
      res.status(401).json({ error: { code: 'invalid_token', message: 'Sessiya muddati tugagan.' } });
    }
  };
}

export function requireRoles(...roles: Actor['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.actor) { res.status(401).json({ error: { code: 'unauthorized', message: 'Kirish talab qilinadi.' } }); return; }
    if (!roles.includes(req.actor.role)) { res.status(403).json({ error: { code: 'forbidden', message: 'Bu amal uchun ruxsat yo‘q.' } }); return; }
    next();
  };
}

export function requireClassAccess(pool: Pool, source: 'params' | 'body' = 'params', key = 'classId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actor = req.actor;
    if (!actor) { res.status(401).json({ error: { code: 'unauthorized', message: 'Kirish talab qilinadi.' } }); return; }
    const classId = source === 'body' ? req.body?.[key] : req.params[key];
    if (typeof classId !== 'string') { res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } }); return; }
    const result = await pool.query(
      `select 1 from classes c where c.id=$1 and (
        ($2='owner' and c.school_id=$3) or
        ($2='teacher' and (c.owner_id=$4 or exists(select 1 from class_teachers ct where ct.class_id=c.id and ct.teacher_id=$4))) or
        ($2='student' and exists(select 1 from enrollments e where e.class_id=c.id and e.student_id=$4 and e.left_at is null))
      )`, [classId, actor.role, actor.schoolId, actor.id],
    );
    if (!result.rowCount) { res.status(404).json({ error: { code: 'not_found', message: 'Topilmadi.' } }); return; }
    next();
  };
}
