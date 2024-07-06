import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

dotenv.config();
const port  = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.json());
const validateUser = (user) => {
    const errors = [];
    if (!user.firstName) errors.push({ field: 'firstName', message: 'First name is required' });
    if (!user.lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
    if (!user.email) errors.push({ field: 'email', message: 'Email is required' });
    if (!user.password) errors.push({ field: 'password', message: 'Password is required' });
    return errors;
  };
app.listen(port, (req, res)=>{
    console.log(`Server is running on port http://localhost:${port}`);
})