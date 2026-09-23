import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { parseStructuredQuestionContent } from '../lib/structured-question-content.js';
import { serializeQuestion } from '../services/question-serializer.js';
import { PgQuestionsRepository } from './questions-repository.js';

interface AssetUrlSigner {
  signStoragePath(storagePath: string, expiresInSeconds?: number): Promise<string | null>;
}

/**
 * Staff question detail is allowed to inspect a source-backed mark scheme that
 * is still waiting for corpus review. Approved schemes always win. Students
 * remain approved-only, so this does not relax assignment/grading visibility.
 *
 * Lesson Studio needs to distinguish a reviewed mark scheme from an extracted
 * scheme that is still waiting for source reconciliation. Keep that trust state
 * in the API rather than styling every scheme as "official" in the browser.
 */
export class PgStaffAwareQuestionsRepository extends PgQuestionsRepository {
  constructor(
    private readonly detailPool: Pool,
    private readonly detailAssetUrlSigner?: AssetUrlSigner,
  ) {
    super(detailPool, detailAssetUrlSigner);
  }

  override async findOne(actor: Actor, id: string) {
    const result = await this.detailPool.query(
      `select q.id,q.display_ref,q.stem_md,q.context_md,q.content_json,q.content_version,
        q.command_word,q.marks,q.ao,q.answer_kind,
        json_build_object('id',p.id,'displayRef',p.display_ref,'contextMd',p.context_md) parent,
        case when $2<>'student' then true else exists(
          select 1 from submissions s join assignment_questions aq on aq.assignment_id=s.assignment_id
          where s.student_id=$3 and s.released_at is not null and aq.question_id=q.id
        ) end can_view_scheme,
        (select jsonb_build_object(
          'id',ms.id,'status',ms.status,'schemeType',ms.scheme_type,'maxMarks',ms.max_marks,'guidanceMd',ms.guidance_md,
          'points',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msp.id,'code',msp.code,'text',msp.text,'marks',msp.marks,'accept',msp.accept,
            'reject',msp.reject,'requires',msp.requires,'isBod',msp.is_bod
          ) order by msp.sort_order) from mark_scheme_points msp where msp.mark_scheme_id=ms.id),'[]'::jsonb),
          'groups',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msg.id,'label',msg.label,'nRequired',msg.n_required,
            'marksPerPoint',msg.marks_per_point,'maxMarks',msg.max_marks
          ) order by msg.id) from mark_scheme_groups msg where msg.mark_scheme_id=ms.id),'[]'::jsonb),
          'levels',coalesce((select jsonb_agg(jsonb_build_object(
            'id',msl.id,'levelNumber',msl.level_number,'minMarks',msl.min_marks,
            'maxMarks',msl.max_marks,'descriptorMd',msl.descriptor_md,
            'indicativeContentMd',msl.indicative_content_md
          ) order by msl.level_number desc,msl.id) from mark_scheme_levels msl where msl.mark_scheme_id=ms.id),'[]'::jsonb),
          'sourceAudit',(select jsonb_build_object(
            'result',msa.result,'sourcePage',msa.source_page,'auditedAt',msa.audited_at,'evidence',msa.evidence
          ) from mark_scheme_source_audits msa
            where msa.mark_scheme_id=ms.id
            order by msa.audited_at desc,msa.id desc
            limit 1)
        )
        from mark_schemes ms
        where ms.question_id=q.id
          and (
            ms.status='approved'
            or ($2<>'student' and ms.status='needs_review')
          )
        order by case when ms.status='approved' then 0 else 1 end,ms.updated_at desc,ms.id
        limit 1) mark_scheme
       from questions q left join questions p on p.id=q.parent_id
       where q.id=$1
         and (($2='student' and q.status='approved') or ($2<>'student' and q.status in ('approved','needs_review')))
         and ($2<>'student' or exists(
         select 1 from assignment_questions aq join assignments a on a.id=aq.assignment_id
         join enrollments e on e.class_id=a.class_id
         where aq.question_id=q.id and e.student_id=$3 and e.left_at is null and a.published_at is not null
       ))`,
      [id, actor.role, actor.id],
    );
    return result.rows[0] ? serializeQuestion(result.rows[0]) : null;
  }

  /** Freeze the canonical source-backed representation into staff selection snapshots. */
  override async portable(actor: Actor, id: string) {
    const portable = await super.portable(actor, id);
    if (!portable) return null;
    const result = await this.detailPool.query(
      `select content_json,content_version
       from questions
       where id=$1 and status in ('approved','needs_review')`,
      [id],
    );
    const row = result.rows[0];
    if (!row?.content_json) return portable;
    if (Number(row.content_version) !== 1) throw new Error('structured_question_version_unsupported');

    const contentJson = parseStructuredQuestionContent(row.content_json);
    const referencedAssetIds = [...new Set(contentJson.blocks.flatMap((block) =>
      block.type === 'asset' ? [block.assetId] : [],
    ))];
    const availableAssetIds = new Set(
      portable.contextBlocks.flatMap((block) => block.assets.map((asset) => asset.id)),
    );
    const missingAssetIds = referencedAssetIds.filter((assetId) => !availableAssetIds.has(assetId));

    let contextBlocks = portable.contextBlocks;
    if (missingAssetIds.length) {
      // content_json can legitimately reference a source visual stored on a sibling
      // question row (for example, a shared table or preceding diagram). The frozen
      // portable unit must therefore carry every explicitly referenced asset, not
      // merely assets owned by the leaf's ancestry. Keep this source-paper scoped.
      const assets = await this.detailPool.query(
        `select qa.id,qa.kind,qa.storage_path,coalesce(qa.svg_markup,qa.content_md) content_md,
          qa.alt_text,qa.sort_order,qa.source_page,qa.crop_status,
          owner.source_paper_id owner_source_paper_id,leaf.source_paper_id leaf_source_paper_id
         from question_assets qa
         join questions owner on owner.id=qa.question_id
         join questions leaf on leaf.id=$2
         where qa.id=any($1::uuid[])
         order by qa.sort_order,qa.id`,
        [missingAssetIds, id],
      );
      if (assets.rows.length !== missingAssetIds.length) {
        throw new Error('structured_question_asset_missing');
      }
      if (assets.rows.some((asset) => asset.owner_source_paper_id !== asset.leaf_source_paper_id)) {
        throw new Error('structured_question_asset_source_mismatch');
      }

      const referencedAssets = await Promise.all(assets.rows.map(async (asset) => ({
        id: String(asset.id),
        kind: String(asset.kind),
        storagePath: asset.storage_path as string | null,
        url: asset.storage_path && this.detailAssetUrlSigner
          ? await this.detailAssetUrlSigner.signStoragePath(String(asset.storage_path), 300)
          : null,
        contentMd: asset.content_md as string | null,
        altText: String(asset.alt_text ?? ''),
        sortOrder: Number(asset.sort_order),
        sourcePage: asset.source_page == null ? null : Number(asset.source_page),
        cropStatus: asset.crop_status == null ? null : String(asset.crop_status),
      })));

      contextBlocks = [
        ...contextBlocks,
        {
          id: `${id}:structured-assets`,
          label: portable.leaf.label,
          displayRef: portable.leaf.displayRef,
          depth: portable.chain.at(-1)?.depth ?? 0,
          context: null,
          assets: referencedAssets,
        },
      ];
    }

    return {
      ...portable,
      contextBlocks,
      leaf: {
        ...portable.leaf,
        contentJson,
      },
    };
  }

  /** Resolve the exact original Cambridge reference used in teacher review UI. */
  async findByDisplayRef(actor: Actor, displayRef: string) {
    if (actor.role === 'student') return null;
    const result = await this.detailPool.query(
      `select id from questions
       where display_ref=$1 and marks is not null and status in ('approved','needs_review')
       order by updated_at desc,id
       limit 1`,
      [displayRef],
    );
    const id = result.rows[0]?.id as string | undefined;
    if (!id) return null;
    const [detail, portable] = await Promise.all([
      this.findOne(actor, id),
      this.portable(actor, id),
    ]);
    return detail && portable ? { detail, portable } : null;
  }
}
