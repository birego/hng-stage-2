import request from 'supertest';
import app from './app';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

describe('Auth Endpoints', () => {
  let userToken;

  const testUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    // Clean up the database before running tests
    await prisma.organization.deleteMany();
    await prisma.organisation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('data.accessToken');
    expect(res.body.data.user).toMatchObject({
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
    });
    userToken = res.body.data.accessToken;
  }, 10000); // Increased timeout to 10 seconds

  it('should not register a user with an existing email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    expect(res.statusCode).toEqual(400);
  });

  it('should log in an existing user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data.accessToken');
  });

  it('should not log in with incorrect credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });
    expect(res.statusCode).toEqual(401);
  });
});

describe('User Endpoints', () => {
  let userToken;
  let userId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: 'password123',
      });
    userToken = res.body.data.accessToken;
    userId = res.body.data.user.userId;
  });

  it('should fetch user details', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toMatchObject({
      userId,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
    });
  });
});

describe('Organisation Endpoints', () => {
  let userToken;
  let orgId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice.smith@example.com',
        password: 'password123',
      });
    userToken = res.body.data.accessToken;
  });

  it('should create a new organisation', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'New Organisation',
        description: 'This is a new organisation.',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty('orgId');
    orgId = res.body.data.orgId;
  });

  it('should fetch user organisations', async () => {
    const res = await request(app)
      .get('/api/organisations')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.organisations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orgId,
          name: 'New Organisation',
          description: 'This is a new organisation.',
        }),
      ])
    );
  });

  it('should fetch organisation details', async () => {
    const res = await request(app)
      .get(`/api/organisations/${orgId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toMatchObject({
      orgId,
      name: 'New Organisation',
      description: 'This is a new organisation.',
    });
  });

  it('should add a user to an organisation', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@example.com',
        password: 'password123',
      });
    const newUserToken = res.body.data.accessToken;
    const newUserId = res.body.data.user.userId;

    const addRes = await request(app)
      .post(`/api/organisations/${orgId}/users`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: newUserId });
    expect(addRes.statusCode).toEqual(200);
    expect(addRes.body.message).toEqual('User added to organisation successfully');
  });
});
