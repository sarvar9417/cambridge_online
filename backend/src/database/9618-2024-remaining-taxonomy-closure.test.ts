import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0175_9618_2024_remaining_taxonomy_closure.sql',import.meta.url),'utf8');

const corrected=[
  ['9618/41/M/J/24 Q1(d)(iii)','19.1-lo-05','19.1-lo-04'],
  ['9618/41/M/J/24 Q1(e)(iii)','19.1-lo-05','19.1-lo-02'],
  ['9618/42/M/J/24 Q3(c)(iii)','19.1-lo-05','19.1-lo-07'],
] as const;

const oopPrimary=[
  '9618/41/O/N/24 Q2(a)(i)',
  '9618/41/O/N/24 Q2(a)(ii)',
  '9618/41/O/N/24 Q2(c)(i)',
  '9618/42/O/N/24 Q1(a)(i)',
  '9618/42/O/N/24 Q1(a)(ii)',
  '9618/42/O/N/24 Q1(c)',
] as const;

describe('0175 remaining 2024 9618 taxonomy closure',()=>{
  it('pins all six reviewed papers to exact QP and MS hashes',()=>{
    for(const hash of [
      'e96ebfa553a7960fc510be38f2f0aeaacc5031c18d8bd7ea1d0712eb58f8dfc3',
      '5bbcb30c30d13ab20970a4ae4f8e7f0bcf79faa6fc00f8f770530b6aa4c0ce26',
      'a0e625893eecdbb50535abcca92ced97d47cfa9beed02fa0bf6af186c7a0252b',
      '09c2788dcdf20692d0036e927fd872be886bbe8e7081ee1fe6c2a36c02f9f679',
      '2679dc897568988e4a63a1679900e353a0e8484a5589d5a8944be3c6c50d3c19',
      'ce0106f1b96bffceaa06249893d6b24d40e9d06a98656d136e29e03e78c8d0d7',
      '94438657867c9301845ef932a8cbc09abb70b41cbf675764c030db8c0b529be8',
      '5cda9c53cbe573c36fd3bbb999c8e2756a16c35b713a6dfcb217c6fd0554955a',
      '2c91c43abd658b2b985cf2063909faa0873b7ae1f11596233662f4702a2b01c7',
      'efa60c884ce1ce9383de3c03214eb43bd001e7bfbeb03ff3dc9550e22b027e5d',
      '714d785ed06744a0fdb69c0a33488cfd9a6ad6fe9ae7a8ad9d7d4da54bb76480',
      'f0048b6d46754e49d4ad24b7820b6e9372b581b96c98066a6858ab814316d425',
    ]) expect(sql).toContain(hash);
    expect(sql).toContain('v_papers<>6');
  });

  it('corrects the three test-step false-positive ADT mappings',()=>{
    for(const [ref,oldCode,newCode] of corrected){
      expect(sql).toContain(`('${ref}','${oldCode}','${newCode}'`);
    }
    expect(sql).toContain('v_stale<>0');
    expect(sql).toContain('v_missing<>0');
  });

  it('promotes only the six source-reviewed low-confidence OOP primary links',()=>{
    for(const ref of oopPrimary) expect(sql).toContain(ref);
    expect(sql).toContain("set_by='manual-source-audit-0175'");
    expect(sql).toContain('v_promoted_primary<>6');
    expect(sql).not.toContain("'9618/41/O/N/24 Q2(c)(ii)'\n  )\n    AND qs.confidence=1.0");
  });

  it('requires zero remaining low-confidence approved 2024 taxonomy rows',()=>{
    expect(sql).toContain('v_low_primary<>0 OR v_low_lo<>0');
    expect(sql).toContain("sy.version_label='2024-2025'");
    expect(sql).toContain("sp.year=2024");
  });

  it('writes durable provenance and avoids content rewrites',()=>{
    expect(sql).toContain("review_tag='manual-source-audit-0175-2024-remaining'");
    expect(sql).toContain("'taxonomy_catalog','backend/src/database/catalogs/9618-2024-2025.json'");
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});
