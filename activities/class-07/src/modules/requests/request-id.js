// INC-701 fix · Path identifier parsing.
//
// A :id that arrives from the URL is client input and must be validated
// BEFORE it reaches SQL. `Number('not-a-number')` is NaN and `parseInt`
// silently accepts junk prefixes like '12abc' as 12 — both would send a
// wrong value to PostgreSQL. This helper accepts ONLY a full, positive,
// integer decimal string.
//
// It belongs to the HTTP boundary: it turns a path segment into either a
// trustworthy integer or a typed contract error. It knows no SQL and no
// domain rules.
import { AppError } from '../../app-error.js';

// Anchored so the WHOLE string must match: '12abc', '1.5', ' 12', '+12',
// '12 ', '0x10', '1e3' are all rejected. No sign, no dot, no spaces.
const POSITIVE_INTEGER = /^[0-9]+$/;

export function parseRequestId(rawId) {
  const text = String(rawId);

  // Reject anything that is not a run of digits, then reject zero.
  // parseInt is deliberately NOT used: it reads a prefix and stops.
  if (!POSITIVE_INTEGER.test(text)) {
    throw new AppError('contract', 'INVALID_REQUEST_ID',
      'Request id must be a positive integer.');
  }

  const value = Number(text);
  // '0' passes the digit test but is not a valid identifier, and a value
  // beyond Number.MAX_SAFE_INTEGER would lose precision in the comparison.
  if (value === 0 || !Number.isSafeInteger(value)) {
    throw new AppError('contract', 'INVALID_REQUEST_ID',
      'Request id must be a positive integer.');
  }

  return value;
}
