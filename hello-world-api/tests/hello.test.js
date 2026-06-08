const request = require('supertest');
const app = require('../src/app');

describe('hello-world-api', () => {
  test('GET /hello returns Hello, World!', async () => {
    const res = await request(app).get('/hello');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, World!' });
  });

  test('GET /hello?name=Foo returns Hello, Foo!', async () => {
    const res = await request(app).get('/hello?name=Foo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, Foo!' });
  });

  test('GET /does-not-exist returns 404 Not Found', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });
});
