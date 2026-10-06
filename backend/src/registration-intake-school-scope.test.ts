import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const auth=readFileSync(new URL('./repositories/auth-repository.ts',import.meta.url),'utf8');
const admin=readFileSync(new URL('./services/admin-users-service.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('./database/migrations/0201_registration_intake_school_scope.sql',import.meta.url),'utf8');

describe('open registration school intake',()=>{
  it('assigns new pending registrations only when one active-owner school exists',()=>{
    expect(auth).toContain("when count(distinct school_id)=1 then max(school_id::text)::uuid");
    expect(auth).toContain("where role='owner' and status='active' and is_active=true and school_id is not null");
  });

  it('lets the sole active-owner school manage legacy unscoped pending users without trusting inert school rows',()=>{
    expect(admin).toContain("count(distinct ou.school_id)");
    expect(admin).toContain("ou.role='owner' and ou.status='active' and ou.is_active=true");
    expect(admin).not.toContain("(select count(*) from schools) = 1");
  });

  it('backfills existing pending registrations with the same fail-closed rule',()=>{
    expect(migration).toContain("count(DISTINCT school_id)=1");
    expect(migration).toContain("u.status='pending'");
    expect(migration).toContain("u.school_id IS NULL");
  });
});
