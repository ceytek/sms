import { describe, expect, it } from 'vitest';
import { humanizeValidationMessages } from './validation-message.js';

describe('humanizeValidationMessages', () => {
  it('turns empty question paths into a Turkish sentence', () => {
    expect(
      humanizeValidationMessages([
        'questions.3.text must be longer than or equal to 1 characters',
        'questions.4.text must be longer than or equal to 1 characters',
        'questions.5.text must be longer than or equal to 1 characters',
      ]),
    ).toBe('4, 5 ve 6. soruların metnini yazın.');
  });

  it('keeps messages already written for the user', () => {
    expect(humanizeValidationMessages('Anket adı zorunludur')).toBe('Anket adı zorunludur.');
  });
});
