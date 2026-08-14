import { assetRules } from './assets.js';
import { classificationRules } from './classification.js';
import { dependencyRules } from './dependencies.js';
import { markSchemeRules } from './mark-scheme.js';
import { qualityRules } from './quality.js';
import { structureRules } from './structure.js';
import type { Finding, RuleCode, RuleDefinition, ValidationContext } from './types.js';

export * from './types.js';
export * from './assets.js';
export * from './classification.js';
export * from './dependencies.js';
export * from './mark-scheme.js';
export * from './quality.js';
export * from './structure.js';

/** Every rule, in code order. The pipeline runs all of them, always. */
export const ALL_RULES: RuleDefinition[] = [
  ...markSchemeRules,
  ...structureRules,
  ...assetRules,
  ...classificationRules,
  ...qualityRules,
  ...dependencyRules,
].sort((a, b) => a.code.localeCompare(b.code));

export const RULE_COUNT = ALL_RULES.length;

export interface ValidationReport {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  /** Paths that must go to review before they can be approved. */
  flaggedPaths: string[];
  /** Paths with at least one error, which can never auto-approve. */
  blockedPaths: string[];
}

/**
 * Runs every rule and summarises the result.
 *
 * A rule that throws is reported as its own error rather than aborting the run:
 * one broken rule must not hide the twenty-two that would have found real
 * problems.
 */
export function validateExtraction(context: ValidationContext): ValidationReport {
  const findings: Finding[] = [];

  for (const rule of ALL_RULES) {
    try {
      findings.push(...rule.run(context));
    } catch (error) {
      findings.push({
        code: rule.code,
        severity: 'error',
        message: `rule ${rule.code} threw: ${(error as Error).message}`,
      });
    }
  }

  const errors = findings.filter((item) => item.severity === 'error');
  const warnings = findings.filter((item) => item.severity === 'warning');

  return {
    findings,
    errorCount: errors.length,
    warningCount: warnings.length,
    flaggedPaths: [...new Set(findings.map((item) => item.path).filter(Boolean) as string[])],
    blockedPaths: [...new Set(errors.map((item) => item.path).filter(Boolean) as string[])],
  };
}

/**
 * Review status for one question.
 *
 * `approved` requires a clean run: any finding at all sends it to a human. The
 * cost of review is minutes; the cost of a wrong mark scheme is a year of
 * silently mis-graded students.
 */
export function statusForQuestion(
  report: ValidationReport,
  path: string,
): 'approved' | 'needs_review' {
  return report.flaggedPaths.includes(path) ? 'needs_review' : 'approved';
}

/** Findings that belong to no single question, e.g. V02 and V09. */
export const paperLevelFindings = (report: ValidationReport) =>
  report.findings.filter((item) => !item.path);

export type { RuleCode };

export interface FlaggedRate {
  leafCount: number;
  flaggedCount: number;
  percentage: number;
  verdict: 'validation_too_soft' | 'healthy' | 'extraction_poor';
}

/**
 * The pipeline's own health check.
 *
 * Below 5% means validation is not catching what it should; above 30% means the
 * extraction is bad and the prompts need fixing before more papers are run.
 */
export function flaggedRate(leafCount: number, flaggedCount: number): FlaggedRate {
  const percentage = leafCount === 0 ? 0 : (flaggedCount / leafCount) * 100;
  return {
    leafCount,
    flaggedCount,
    percentage,
    verdict:
      percentage < 5 ? 'validation_too_soft' : percentage > 30 ? 'extraction_poor' : 'healthy',
  };
}
