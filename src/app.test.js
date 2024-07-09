import request from 'supertest';
import app from './app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || '123a';

beforeAll(async () => {
  await prisma.organisationsOnUsers.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  it('should register user successfully with default organisation', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '1234567890'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'Registration successful');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toHaveProperty('userId');
    expect(res.body.data.user).toHaveProperty('firstName', 'John');
    expect(res.body.data.user).toHaveProperty('lastName', 'Doe');
    expect(res.body.data.user).toHaveProperty('email', 'john.doe@example.com');
    expect(res.body.data.user).toHaveProperty('phone', '1234567890');
  });

  it('should fail if required fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'John'
      });

    expect(res.statusCode).toEqual(422);
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors).toEqual([
      { field: 'lastName', message: 'Last name is required' },
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' }
    ]);
  });

  it('should fail if there is a duplicate email', async () => {
    await prisma.user.create({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '0987654321'
      }
    });

    const res = await request(app)
      .post('/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: 'password123',
        phone: '0987654321'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('status', 'Bad request');
    expect(res.body).toHaveProperty('message', 'Registration unsuccessful');
  });
});

describe('POST /auth/login', () => {
  it('should log the user in successfully', async () => {
    await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '1231231234'
      }
    });

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test.user@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'Login successful');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toHaveProperty('userId');
    expect(res.body.data.user).toHaveProperty('firstName', 'Test');
    expect(res.body.data.user).toHaveProperty('lastName', 'User');
    expect(res.body.data.user).toHaveProperty('email', 'test.user@example.com');
    expect(res.body.data.user).toHaveProperty('phone', '1231231234');
  });

  it('should return 401 error if authentication fails', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'wrong.email@example.com',
        password: 'wrongpassword'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('status', 'Bad request');
    expect(res.body).toHaveProperty('message', 'Authentication failed');
  });
});

describe('GET /api/users/:id', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '1231231234'
      }
    });

    userId = user.userId;

    accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: '1h'
    });
  });

  it('should fetch user record successfully', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'User record fetched successfully');
    expect(res.body.data).toHaveProperty('userId', userId);
    expect(res.body.data).toHaveProperty('firstName', 'Test');
    expect(res.body.data).toHaveProperty('lastName', 'User');
    expect(res.body.data).toHaveProperty('email', 'test.user@example.com');
    expect(res.body.data).toHaveProperty('phone', '1231231234');
  });

  it('should return 404 if user is not found', async () => {
    const res = await request(app)
      .get('/api/users/nonexistentuserid')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(404);
  });
});

describe('GET /api/organisations', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '1231231234'
      }
    });

    userId = user.userId;

    accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: '1h'
    });
  });

  it('should fetch organisations successfully', async () => {
    const res = await request(app)
      .get('/api/organisations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'Organisations fetched successfully');
    expect(res.body.data.organisations).toBeInstanceOf(Array);
  });
});

describe('POST /api/organisations', () => {
  let accessToken;
  let userId;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '1231231234'
      }
    });

    userId = user.userId;

    accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: '1h'
    });
  });

  it('should create organisation successfully', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'New Organisation',
        description: 'Description de la nouvelle organisation'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'Organisation created successfully');
    expect(res.body.data).toHaveProperty('orgId');
    expect(res.body.data).toHaveProperty('name', 'New Organisation');
    expect(res.body.data).toHaveProperty('description', 'Description de la nouvelle organisation');
  });

  it('should fail if name is not provided', async () => {
    const res = await request(app)
      .post('/api/organisations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Description sans nom'
      });

    expect(res.statusCode).toEqual(422);
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors).toEqual([
      { field: 'name', message: 'Name is required' }
    ]);
  });
});

describe('POST /api/organisations/:orgId/users', () => {
  let accessToken;
  let userId;
  let orgId;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '1231231234'
      }
    });

    userId = user.userId;

    const org = await prisma.organisation.create({
      data: {
        name: 'New Organisation',
        description: 'Description de la nouvelle organisation',
        users: {
          create: {
            user: { connect: { userId: user.userId } }
          }
        }
      }
    });

    orgId = org.orgId;

    accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: '1h'
    });
  });

  it('should add user to organisation successfully', async () => {
    const newUser = await prisma.user.create({
      data: {
        firstName: 'New',
        lastName: 'User',
        email: 'new.user@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '1231231235'
      }
    });

    const res = await request(app)
      .post(`/api/organisations/${orgId}/users`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userId: newUser.userId
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body).toHaveProperty('message', 'User added to organisation successfully');
  });

  it('should return 404 if organisation is not found', async () => {
    const res = await request(app)
      .post('/api/organisations/nonexistentorgid/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        userId: userId
      });

    expect(res.statusCode).toEqual(404);
  });
});
