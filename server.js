import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";

dotenv.config();
const port = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET 
const validateUser = (user) => {
  const errors = [];
  if (!user.firstName)
    errors.push({ field: "firstName", message: "First name is required" });
  if (!user.lastName)
    errors.push({ field: "lastName", message: "Last name is required" });
  if (!user.email)
    errors.push({ field: "email", message: "Email is required" });
  if (!user.password)
    errors.push({ field: "password", message: "Password is required" });
  return errors;
};
app.post("/auth/register", async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  const errors = validateUser(req.body);
  if (errors.length) {
    return res.status(422).json({ errors });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        organisations: {
          create: {
            organisation: {
              create: {
                name: `${firstName}'s Organisation`,
              },
            },
          },
        },
      },
    });

    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      status: "success",
      message: "Registration successful",
      data: {
        accessToken: token,
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "Bad request",
      message: "Registration unsuccessful",
      statusCode: 400,
    });
  }
});
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
  
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        status: 'Bad request',
        message: 'Authentication failed',
        statusCode: 401
      });
    }
  
    const token = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '1h' });
  
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        accessToken: token,
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone
        }
      }
    });
  });
  const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.sendStatus(403);
  
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };
  app.get('/api/users/:id', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { userId: req.params.id } });
    if (!user) return res.sendStatus(404);
  
    res.status(200).json({
      status: 'success',
      message: 'User record fetched successfully',
      data: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      }
    });
  });
  
app.listen(port, (req, res) => {
  console.log(`Server is running on port http://localhost:${port}`);
});
