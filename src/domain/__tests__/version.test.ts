import { describe, expect, it } from 'vitest';
import { compareVersions, mustUpdate } from '../version';

describe('versión mínima', () => {
  it('compara números, no texto', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('0.1.0', '0.2.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0-beta', '2.0.0')).toBe(0);
  });

  it('pide actualizar solo si la versión es menor a la mínima', () => {
    expect(mustUpdate('0.1.0', '0.2.0')).toBe(true);
    expect(mustUpdate('0.2.0', '0.2.0')).toBe(false);
    expect(mustUpdate('1.0.0', null)).toBe(false);
  });
});
