-- Reconcile production app migration ledger for source-fidelity migrations that
-- were already applied through the managed Supabase migration channel.
-- The assertions are postcondition-based so this file is also safe on a fresh
-- environment where the preceding migrations were executed by the app migrator.

DO $$
BEGIN
  IF to_regprocedure('public.flag_source_fidelity_requirements_v3(text,integer)') IS NULL THEN
    RAISE EXCEPTION 'source_fidelity_ledger_reconcile_missing_detector_v3';
  END IF;
  IF to_regprocedure('public.repair_question_source_asset_v1(uuid,uuid,text,jsonb,boolean)') IS NULL THEN
    RAISE EXCEPTION 'source_fidelity_ledger_reconcile_missing_asset_repair_contract';
  END IF;
  IF to_regprocedure('public.sync_repaired_source_assets_v3(text,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'source_fidelity_ledger_reconcile_missing_asset_order_sync_v3';
  END IF;
END $$;

INSERT INTO public.schema_migrations(name) VALUES
 ('0152_source_fidelity_detector_v3.sql'),
 ('0153_source_fidelity_bootstrap_evidence.sql'),
 ('0155_source_asset_rule_scoped_resolution.sql'),
 ('0156_source_fidelity_owner_boundary_guard.sql'),
 ('0157_source_fidelity_detector_v4_reconciliation.sql'),
 ('0158_source_fidelity_full_cue_reconciliation.sql'),
 ('0159_source_asset_order_sync_v3.sql'),
 ('0160_source_fidelity_ledger_reconcile.sql')
ON CONFLICT(name) DO NOTHING;
