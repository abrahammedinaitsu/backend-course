// Prints a cryptographically random value suitable for JWT_SECRET.
// Paste the output into your local .env — never commit it, never share it.
import { randomBytes } from 'node:crypto';

console.log(randomBytes(32).toString('base64url'));
console.log('\nPaste this value as JWT_SECRET in your local .env file.');
console.log('Do not commit it. Do not share it. Do not paste it into an AI chat.');
