// Login helper: exchanges known credentials for a Bearer token.
import request from 'supertest';
import app from '../../src/app.js';

export async function loginAs(user) {
  const response = await request(app)
    .post('/auth/login')
    .send({ email: user.email, password: user.password });
  if (response.status !== 200) {
    throw new Error(`Could not log in as ${user.email} (${response.status}).`);
  }
  return response.body.accessToken;
}
