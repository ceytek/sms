import { describe, expect, it } from 'vitest';
import { normalizeOriginatorName, originatorNameKey } from './originator-name.js';

describe('normalizeOriginatorName', () => {
  it('keeps mixed case and strips spaces', () => {
    expect(normalizeOriginatorName('  Vizyon Net ')).toBe('VizyonNet');
    expect(normalizeOriginatorName('testing')).toBe('testing');
  });
});

describe('originatorNameKey', () => {
  it('compares names without case', () => {
    expect(originatorNameKey('testing')).toBe(originatorNameKey('TESTING'));
    expect(originatorNameKey('VizyonNet')).toBe(originatorNameKey('vizyonnet'));
  });
});
