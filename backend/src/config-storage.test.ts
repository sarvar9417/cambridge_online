import { describe, expect, it } from 'vitest';
import { resolveSupabaseStorageEnv } from './config.js';

describe('resolveSupabaseStorageEnv',()=>{
  it('prefers the dedicated storage configuration',()=>{
    expect(resolveSupabaseStorageEnv({
      SUPABASE_URL:'https://dedicated.supabase.co',
      NEXT_PUBLIC_SUPABASE_URL:'https://public.supabase.co',
      SUPABASE_STORAGE_SECRET_KEY:'sb_secret_dedicated',
      SUPABASE_SECRET_KEY:'sb_secret_standard',
      SUPABASE_SERVICE_ROLE_KEY:'legacy.jwt.value',
    })).toEqual({
      url:'https://dedicated.supabase.co',
      secretKey:'sb_secret_dedicated',
    });
  });

  it('accepts standard Supabase deployment aliases',()=>{
    expect(resolveSupabaseStorageEnv({
      NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co',
      SUPABASE_SECRET_KEY:'sb_secret_standard',
    })).toEqual({
      url:'https://project.supabase.co',
      secretKey:'sb_secret_standard',
    });
    expect(resolveSupabaseStorageEnv({
      VITE_SUPABASE_URL:'https://vite-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY:'legacy.service.role',
    })).toEqual({
      url:'https://vite-project.supabase.co',
      secretKey:'legacy.service.role',
    });
  });

  it('stays unavailable when no server secret exists',()=>{
    expect(resolveSupabaseStorageEnv({
      SUPABASE_URL:'https://project.supabase.co',
    })).toEqual({
      url:'https://project.supabase.co',
      secretKey:undefined,
    });
  });
});
