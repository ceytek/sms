import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

export const SHORT_CODE_PROVIDER = 'SHORT_CODE_PROVIDER';

export type ShortCodeSendResult = {
  providerRef: string;
  code: string;
};

export interface ShortCodeProvider {
  send(normalizedPhone: string): Promise<ShortCodeSendResult>;
}

@Injectable()
export class StubShortCodeProvider implements ShortCodeProvider {
  async send(_normalizedPhone: string): Promise<ShortCodeSendResult> {
    const code = String(randomInt(100000, 1000000));
    return {
      providerRef: `stub-${Date.now()}`,
      code,
    };
  }
}
