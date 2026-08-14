import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from './questions-repository.js';
import {
  buildSelectionReview,
  type SelectionItemPortable,
  type SelectionRole,
} from '../services/selection-review.js';

export class PgSelectionsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly questions: PgQuestionsRepository,
  ) {}

  private eligible(actor: Actor) {
    return actor.role !== 'student' && Boolean(actor.schoolId);
  }

  private async owns(actor: Actor, selectionId: string) {
    if (!this.eligible(actor)) return false;
    const result = await this.pool.query(
      `select 1 from selections where id=$1 and owner_id=$2 and school_id=$3`,
      [selectionId, actor.id, actor.schoolId],
    );
    return Boolean(result.rowCount);
  }

  async list(actor: Actor) {
    if (!this.eligible(actor)) return [];
    return (
      await this.pool.query(
        `select s.id,s.name,s.created_at,s.updated_at,count(si.id)::int item_count,
          coalesce(sum(case when si.role='graded' then q.marks else 0 end),0)::int total_marks
         from selections s
         left join selection_items si on si.selection_id=s.id
         left join questions q on q.id=si.question_id
         where s.owner_id=$1 and s.school_id=$2
         group by s.id order by s.updated_at desc`,
        [actor.id, actor.schoolId],
      )
    ).rows;
  }

  async create(actor: Actor, name: string) {
    if (!this.eligible(actor)) return null;
    return (
      await this.pool.query(
        `insert into selections(school_id,owner_id,name) values($1,$2,$3)
         returning id,name,created_at,updated_at`,
        [actor.schoolId, actor.id, name],
      )
    ).rows[0];
  }

  async items(actor: Actor, selectionId: string): Promise<SelectionItemPortable[] | null> {
    if (!(await this.owns(actor, selectionId))) return null;
    const rows = (
      await this.pool.query(
        `select si.id,si.question_id,si.role,si.sort_order,si.source_ref
         from selection_items si
         where si.selection_id=$1
         order by si.sort_order,si.created_at`,
        [selectionId],
      )
    ).rows;

    const items: SelectionItemPortable[] = [];
    for (const row of rows) {
      const portable = await this.questions.portable(actor, row.question_id);
      // A question may have been unapproved/archived after it was selected.
      // Keep the basket readable by omitting inaccessible items from the
      // portable review rather than leaking cross-school question data.
      if (!portable) continue;
      items.push({
        id: row.id,
        role: row.role,
        sortOrder: row.sort_order,
        sourceRef: row.source_ref,
        portable,
      });
    }
    return items;
  }

  async review(actor: Actor, selectionId: string) {
    const items = await this.items(actor, selectionId);
    return items ? buildSelectionReview(items) : null;
  }

  async addItem(
    actor: Actor,
    selectionId: string,
    questionId: string,
    role: SelectionRole,
  ) {
    if (!this.eligible(actor)) return null;
    const portable = await this.questions.portable(actor, questionId);
    if (!portable) return null;

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const selection = await client.query(
        `select id from selections where id=$1 and owner_id=$2 and school_id=$3 for update`,
        [selectionId, actor.id, actor.schoolId],
      );
      if (!selection.rowCount) {
        await client.query('rollback');
        return null;
      }

      const inserted = await client.query(
        `insert into selection_items(selection_id,question_id,role,sort_order,source_ref)
         values(
           $1,$2,$3,
           (select coalesce(max(sort_order),0)+1 from selection_items where selection_id=$1),
           $4
         )
         on conflict(selection_id,question_id)
         do update set role=excluded.role
         returning id,question_id,role,sort_order,source_ref`,
        [selectionId, questionId, role, portable.sourceRef],
      );
      await client.query(`update selections set updated_at=now() where id=$1`, [selectionId]);
      await client.query('commit');
      return {
        item: inserted.rows[0],
        portable,
        dependencies: portable.dependencies,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateItem(
    actor: Actor,
    selectionId: string,
    itemId: string,
    role: SelectionRole,
  ) {
    if (!this.eligible(actor)) return null;
    const result = await this.pool.query(
      `update selection_items si set role=$4
       from selections s
       where si.id=$1 and si.selection_id=$2
         and s.id=si.selection_id and s.owner_id=$3 and s.school_id=$5
       returning si.id,si.question_id,si.role,si.sort_order,si.source_ref`,
      [itemId, selectionId, actor.id, role, actor.schoolId],
    );
    if (!result.rowCount) return null;
    await this.pool.query(`update selections set updated_at=now() where id=$1`, [selectionId]);
    return result.rows[0];
  }

  async removeItem(actor: Actor, selectionId: string, itemId: string) {
    if (!this.eligible(actor)) return false;
    const result = await this.pool.query(
      `delete from selection_items si using selections s
       where si.id=$1 and si.selection_id=$2
         and s.id=si.selection_id and s.owner_id=$3 and s.school_id=$4
       returning si.id`,
      [itemId, selectionId, actor.id, actor.schoolId],
    );
    if (!result.rowCount) return false;
    await this.pool.query(`update selections set updated_at=now() where id=$1`, [selectionId]);
    return true;
  }
}
