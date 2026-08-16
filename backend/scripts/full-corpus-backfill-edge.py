#!/usr/bin/env python3
from __future__ import annotations

import collections
import json
import os
import runpy
import sys

impl = runpy.run_path('backend/scripts/full-corpus-backfill.py', run_name='corpus_backfill_impl')
runner = impl['runner']
fit_model = impl['fit_model']
choose_model = impl['choose_model']
choose_lo_fallback = impl['choose_lo_fallback']
strong_subtopic_rule = impl['strong_subtopic_rule']
answer_kind = impl['answer_kind']


def main() -> int:
    boot = runner('bootstrap', timeout=150)['data']
    sources = list(boot.get('sources') or [])
    train_sub = list(boot.get('training_subtopics') or [])
    train_lo = list(boot.get('training_los') or [])
    coverage_rows = list(boot.get('coverage') or [])

    year_filter = os.getenv('BACKFILL_YEAR', '').strip()
    series_filter = os.getenv('BACKFILL_SERIES', '').strip()
    limit = int(os.getenv('BACKFILL_LIMIT', '500'))
    if year_filter:
        sources = [x for x in sources if int(x['year']) == int(year_filter)]
    if series_filter:
        sources = [x for x in sources if str(x['series']) == series_filter]
    sources = sources[:limit]

    sub_training: dict[int, list[tuple[str, str]]] = collections.defaultdict(list)
    sub_counts: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    for r in train_sub:
        component = int(r['component'])
        text = f"PATH {r.get('path','')} {r.get('stem','')} {r.get('guidance','')}"
        label = str(r['subtopic'])
        sub_training[component].append((text, label))
        sub_counts[component][label] += 1
    sub_models = {c: fit_model(rows) for c, rows in sub_training.items()}

    lo_training: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    lo_counts: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for r in train_lo:
        subtopic = str(r['subtopic'])
        text = f"PATH {r.get('path','')} {r.get('stem','')} {r.get('guidance','')}"
        label = str(r['lo'])
        lo_training[subtopic].append((text, label))
        lo_counts[subtopic][label] += 1
    lo_models = {s: fit_model(rows) for s, rows in lo_training.items()}

    coverage = {(str(r['syllabus_id']), str(r['component_id'])): r for r in coverage_rows}
    print(json.dumps({'event':'bootstrap','remaining_sources':len(boot.get('sources') or []),'selected':len(sources)}, separators=(',',':')))

    succeeded, failed = [], []
    for source in sources:
        key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
        try:
            ext = runner('extract', {'qp_url':source['qp_url'],'ms_url':source['ms_url']}, timeout=45)
            raw_rows = list(ext.get('rows') or [])
            if int(ext.get('total') or 0) != 75:
                raise RuntimeError(f"extract_total_not_75:{ext.get('total')}")
            if ext.get('missing'):
                raise RuntimeError('extract_missing_stems:' + ','.join(ext['missing']))
            if not raw_rows:
                raise RuntimeError('extract_empty')

            cov = coverage.get((str(source['syllabus_id']), str(source['component_id'])))
            if not cov:
                raise RuntimeError('coverage_missing')
            allowed_subtopics = {str(x) for x in cov.get('subtopics') or []}
            allowed_los_by_sub: dict[str, list[dict]] = collections.defaultdict(list)
            for lo in cov.get('los') or []:
                allowed_los_by_sub[str(lo['subtopic'])].append(lo)

            component = int(source['component'])
            rows, low = [], []
            for raw in raw_rows:
                path = str(raw['path'])
                stem = str(raw.get('stem') or '')
                guidance = str(raw.get('guidance') or '')
                text = f"PATH {path} {stem} {guidance}"

                subtopic, sub_conf = choose_model(sub_models.get(component), text, allowed_subtopics)
                rule_sub, rule_conf = strong_subtopic_rule(component, text, allowed_subtopics)
                if rule_sub and (subtopic is None or sub_conf < 0.56 or rule_conf >= sub_conf + 0.18):
                    subtopic, sub_conf = rule_sub, rule_conf
                if subtopic is None:
                    for candidate, _ in sub_counts[component].most_common():
                        if candidate in allowed_subtopics:
                            subtopic, sub_conf = candidate, 0.50
                            break
                if subtopic is None:
                    raise RuntimeError('no_allowed_subtopic:' + path)

                allowed_los = allowed_los_by_sub.get(subtopic, [])
                allowed_codes = {str(x['code']) for x in allowed_los}
                lo, lo_conf = choose_model(lo_models.get(subtopic), text, allowed_codes)
                if lo is None:
                    lo, lo_conf = choose_lo_fallback(text, allowed_los, lo_counts[subtopic])

                row = {
                    'path': path,
                    'marks': int(raw['marks']),
                    'stem': stem,
                    'guidance': guidance,
                    'subtopic': subtopic,
                    'lo': lo,
                    'answer_kind': answer_kind(component, stem),
                    'confidence': round(max(0.45, min(0.99, sub_conf)), 4),
                    'lo_confidence': round(max(0.40, min(0.99, lo_conf)), 4),
                    'method': 'edge-unpdf+tfidf-logreg+component-coverage-v3',
                }
                rows.append(row)
                if row['confidence'] < 0.62 or row['lo_confidence'] < 0.52:
                    low.append([path, subtopic, row['confidence'], lo, row['lo_confidence']])

            if sum(r['marks'] for r in rows) != 75:
                raise RuntimeError('rows_total_not_75')
            result = runner('apply', {'qp_id':source['qp_id'],'ms_id':source['ms_id'],'rows':rows}, timeout=60)
            summary = {'paper':key,'leaves':len(rows),'marks':75,'low':low[:10],'result':result.get('result')}
            succeeded.append(summary)
            print(json.dumps({'event':'paper_ok',**summary}, separators=(',',':'), default=str))
        except Exception as exc:
            failure = {'paper':key,'error':str(exc)[:1800]}
            failed.append(failure)
            print(json.dumps({'event':'paper_failed',**failure}, separators=(',',':')), file=sys.stderr)

    print(json.dumps({'event':'final','selected':len(sources),'succeeded':len(succeeded),'failed':len(failed),'failed_papers':failed}, separators=(',',':')))
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
