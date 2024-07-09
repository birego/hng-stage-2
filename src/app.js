import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || '123a';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/auth/register', 
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Email is required'),
  body('password').isLength({ min: 5 }).withMessage('Password is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, phone } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          phone
        }
      });

      const organisation = await prisma.organisation.create({
        data: {
          name: 'default',
          description: 'Default organisation',
          users: {
            create: {
              user: { connect: { userId: user.userId } }
            }
          }
        }
      });

      const accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
        expiresIn: '1h'
      });

      res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        data: {
          accessToken,
          user: {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone
          }
        }
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({
        status: 'Bad request',
        message: 'Registration unsuccessful'
      });
    }
  }
);

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
        expiresIn: '1h'
      });

      res.json({
        status: 'success',
        message: 'Login successful',
        data: {
          accessToken,
          user: {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone
          }
        }
      });
    } else {
      res.status(401).json({
        status: 'Bad request',
        message: 'Authentication failed'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { userId: id }
    });

    if (!user) {
      return res.sendStatus(404);
    }

    res.json({
      status: 'success',
      message: 'User record fetched successfully',
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

app.get('/api/organisations', authenticateToken, async (req, res) => {
  try {
    const organisations = await prisma.organisation.findMany({
      include: {
        users: true
      }
    });

    res.json({
      status: 'success',
      message: 'Organisations fetched successfully',
      data: { organisations }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

app.post('/api/organisations', authenticateToken, 
  body('name').notEmpty().withMessage('Name is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    try {
      const organisation = await prisma.organisation.create({
        data: {
          name,
          description,
          users: {
            create: {
              user: { connect: { userId: req.user.userId } }
            }
          }
        }
      });

      res.status(201).json({
        status: 'success',
        message: 'Organisation created successfully',
        data: organisation
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
);

app.post('/api/organisations/:orgId/users', authenticateToken, async (req, res) => {
  const { orgId } = req.params;
  const { userId } = req.body;

  try {
    const organisation = await prisma.organisation.findUnique({
      where: { orgId },
      include: { users: true }
    });

    if (!organisation) {
      return res.sendStatus(404);
    }

    await prisma.organisationsOnUsers.create({
      data: {
        userId,
        orgId
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'User added to organisation successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default app;
