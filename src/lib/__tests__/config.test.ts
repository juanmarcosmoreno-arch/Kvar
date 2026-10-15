import { describe, expect, it } from 'vitest';
import { cleanSupabaseKey, cleanSupabaseUrl, configProblem } from '../config';

describe('configuración de Supabase', () => {
  it('arregla direcciones mal pegadas', () => {
    expect(cleanSupabaseUrl('https://abcd.supabase.co')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('abcd.supabase.co')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl(' "https://abcd.supabase.co/" ')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('“https://abcd.supabase.co”')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('https://abcd.supabase.co\\')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('https://abcd.supabase.co/rest/v1/')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('<https://abcd.supabase.co>')).toBe('https://abcd.supabase.co');
    // Caso real: «https:» duplicado y la ruta de la API al final
    expect(cleanSupabaseUrl('https:https://ahcdgfmutzizcdmwwlyj.supabase.co/rest/v1/')).toBe('https://ahcdgfmutzizcdmwwlyj.supabase.co');
    expect(cleanSupabaseUrl('https://https://abcd.supabase.co')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('http//abcd.supabase.co')).toBe('https://abcd.supabase.co');
    expect(cleanSupabaseUrl('http://localhost:54321')).toBe('http://localhost:54321');
    expect(cleanSupabaseUrl('http://127.0.0.1:54321/')).toBe('http://127.0.0.1:54321');
  });

  it('rechaza lo que no es una dirección', () => {
    expect(cleanSupabaseUrl('')).toBeNull();
    expect(cleanSupabaseUrl('TU PROYECTO')).toBeNull();
    expect(cleanSupabaseUrl('abcd')).toBeNull();
  });

  it('claves', () => {
    expect(cleanSupabaseKey(' "sb_publishable_ABC" ')).toBe('sb_publishable_ABC');
    expect(cleanSupabaseKey('sb pub')).toBeNull();
    expect(configProblem('https://a.supabase.co', 'sb_publishable_x')).toBeNull();
    expect(configProblem('https://a.supabase.co', 'sb_secret_x')).toBe('secret-key');
    expect(configProblem('nada', 'sb_publishable_x')).toBe('bad-url');
    expect(configProblem('', 'x')).toBe('missing');
  });
});
