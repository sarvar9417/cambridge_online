import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface LiveExamRealtimeEvent {
  version: number;
  type: string;
  createdAt: Date | string;
}

export interface LiveExamRealtimeCursor {
  sessionId: string;
  currentVersion: number;
  changed: boolean;
  events: LiveExamRealtimeEvent[];
}

/**
 * Lightweight synchronisation cursor for Live Exam clients.
 *
 * The database session remains authoritative. This service deliberately emits
 * only event metadata: clients use a version advance as a notification and
 * recover the complete authorised state through LiveExamService.snapshot().
 * That keeps mark schemes, answers, identities and teacher-only fields out of
 * the notification channel while still allowing fast classroom updates.
 */
export class LiveExamRealtimeService {
  constructor(private readonly pool: Pool) {}

  private async authorisedVersion(actor: Actor, sessionId: string) {
    const result = await this.pool.query(
      `select les.version
       from live_exam_sessions les
       join classes c on c.id=les.class_id
       left join live_exam_participants lep
         on lep.session_id=les.id and lep.student_id=$3 and lep.left_at is null
       where les.id=$1 and (
         ($2='student' and lep.id is not null)
         or ($2='owner' and c.school_id=$4)
         or ($2='teacher' and (
           c.owner_id=$3 or exists(
             select 1 from class_teachers ct
             where ct.class_id=c.id and ct.teacher_id=$3
           )
         ))
       )`,
      [sessionId, actor.role, actor.id, actor.schoolId],
    );
    if (!result.rowCount) throw new DomainError('not_found', 404);
    return Number(result.rows[0].version);
  }

  async events(actor: Actor, sessionId: string, afterVersion: number, limit = 50): Promise<LiveExamRealtimeCursor> {
    const currentVersion = await this.authorisedVersion(actor, sessionId);
    if (afterVersion >= currentVersion) {
      return { sessionId, currentVersion, changed: false, events: [] };
    }

    const result = await this.pool.query(
      `select session_version,event_type,created_at
       from live_exam_events
       where session_id=$1 and session_version>$2
       order by session_version asc
       limit $3`,
      [sessionId, afterVersion, limit],
    );

    return {
      sessionId,
      currentVersion,
      changed: true,
      events: result.rows.map((row) => ({
        version: Number(row.session_version),
        type: String(row.event_type),
        createdAt: row.created_at,
      })),
    };
  }
}
