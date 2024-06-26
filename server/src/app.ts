import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/api.routes';

dotenv.config();

const app = express();

// Middleware and configuration settings
app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes declaration
app.use("/api/v1", apiRouter);

export { app };
