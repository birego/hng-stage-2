import request from 'supertest';
import app from './app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.organization.deleteMany();
  await prisma.organisation.deleteMany();
  await prisma.user.deleteMany();
});

describe('POST /auth/register', () => {
  it('should register user successfully with default organisation', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('userId');
  }, 10000); // Augmente le timeout pour ce test

  it('should fail if required fields are missing', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John',
      });
    expect(response.status).toBe(422); // Attendre un statut 422 comme retourné par votre API
  });

  it('should fail if there is a duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      });

    const response = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      });
    expect(response.status).toBe(400); // Attendre un statut 400 comme retourné par votre API
  });
});

describe('POST /auth/login', () => {
  it('should log the user in successfully', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      });

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'password123',
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data.accessToken'); // Vérifiez la bonne propriété dans la réponse
  });

  it('should return 401 error if authentication fails', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'wrongpassword',
      });
    expect(response.status).toBe(401);
  });
});
