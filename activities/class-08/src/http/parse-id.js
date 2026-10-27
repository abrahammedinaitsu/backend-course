// Validation of the :id route parameter — at the HTTP boundary, which is
// the first place the value is known. A request id is a positive integer
// written in full: nothing else may reach SQL.
//
// Why not Number() or parseInt()? Number('abc') is NaN (and NaN inside a
// query produces a PostgreSQL error, not a 400), and parseInt('12abc')
// silently accepts '12abc' as 12 — an id the client never sent. A strict
// pattern rejects text, decimals, zero, negatives and the empty string,
// and answers with the contract instead of an internal error.
import { AppError } from '../app-error.js';

// 1-18 digits, no leading zero: comfortably inside BIGINT. Longer values
// are not identifiers this API ever issued.
const POSITIVE_INTEGER = /^[1-9][0-9]{0,17}$/;

export function parseIdParam(raw) {
  if (typeof raw !== 'string' || !POSITIVE_INTEGER.test(raw)) {
    throw new AppError('contract', 'INVALID_REQUEST_ID',
      'Request id must be a positive integer.');
  }
  return Number(raw);
}
