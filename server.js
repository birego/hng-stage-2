import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

dotenv.config();
const port  = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.listen(port, (req, res)=>{
    console.log(`Server is running on port http://localhost:${port}`);
})