import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import app from './app';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || '123a';

beforeAll(async () => {
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('should register user successfully with default organisation', async () => {
    const response = await request(app).post('/auth/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data.user).toHaveProperty('userId');
    expect(response.body.data.user.email).toBe('john.doe@example.com');
  }, 10000);

  it('should fail if required fields are missing', async () => {
    const response = await request(app).post('/auth/register').send({
      firstName: 'John',
    });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('errors');
  });

  it('should fail if there is a duplicate email', async () => {
    await request(app).post('/auth/register').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'password123',
    });

    const response = await request(app).post('/auth/register').send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Registration unsuccessful');
  }, 10000);
});

describe('POST /auth/login', () => {
  it('should log the user in successfully', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'john.doe@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('accessToken');
  });

  it('should return 401 error if authentication fails', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'john.doe@example.com',
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('Bad request');
  });
});
