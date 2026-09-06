const request = require('supertest');
const app = require('../src/app');

describe('goodbye-endpoint', () => {
  test('GET /goodbye returns Goodbye, World!', async () => {
    const res = await request(app).get('/goodbye');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Goodbye, World!' });
  });

  test('GET /goodbye?name=Foo returns Goodbye, Foo!', async () => {
    const res = await request(app).get('/goodbye?name=Foo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Goodbye, Foo!' });
  });
});
