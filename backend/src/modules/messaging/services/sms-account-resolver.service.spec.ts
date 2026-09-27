import { describe, expect, it } from 'vitest';
import { nextSmsAccountOwnerId } from './sms-account-resolver.service.js';

describe('nextSmsAccountOwnerId', () => {
  it('prefers the dealer that owns the customer', () => {
    expect(
      nextSmsAccountOwnerId({
        dealerCompanyId: 'dealer-1',
        parentCompanyId: 'parent-1',
      }),
    ).toBe('dealer-1');
  });

  it('falls back to parent company for sub-dealers', () => {
    expect(nextSmsAccountOwnerId({ dealerCompanyId: null, parentCompanyId: 'top-dealer' })).toBe(
      'top-dealer',
    );
  });

  it('stops at the top of the chain', () => {
    expect(nextSmsAccountOwnerId({ dealerCompanyId: null, parentCompanyId: null })).toBeNull();
  });
});
