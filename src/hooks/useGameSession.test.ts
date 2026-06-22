import { describe, expect, it } from 'vitest';
import { isUniqueConstraintViolation } from '../lib/sessionLifecycle';

describe('isUniqueConstraintViolation', () => {
  it('recognizes a concurrent active-session insert', () => {
    expect(isUniqueConstraintViolation({ code: '23505' })).toBe(true);
  });

  it('does not hide unrelated database errors', () => {
    expect(isUniqueConstraintViolation({ code: '42501' })).toBe(false);
    expect(isUniqueConstraintViolation(null)).toBe(false);
  });
});
