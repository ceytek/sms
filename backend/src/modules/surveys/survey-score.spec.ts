import { describe, expect, it } from 'vitest';
import { npsBreakdown } from './survey.constants.js';

describe('npsBreakdown', () => {
  it('scores promoters minus detractors', () => {
    const result = npsBreakdown([10, 9, 8, 7, 6, 0]);
    expect(result.promoters).toBe(2);
    expect(result.passives).toBe(2);
    expect(result.detractors).toBe(2);
    expect(result.score).toBe(0);
  });
});
