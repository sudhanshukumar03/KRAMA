import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import helmet from 'helmet';
dotenv.config();
const app = express();
const prisma = new PrismaClient();
// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
// Parsers
app.use(express.json());
app.use(cookieParser());
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import pageRoutes from './routes/page.routes';
import goalRoutes from './routes/goal.routes';
import habitRoutes from './routes/habit.routes';
import sprintRoutes from './routes/sprint.routes';
import dailyLogRoutes from './routes/dailyLog.routes';
// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/sprints', sprintRoutes);
app.use('/api/v1/daily-logs', dailyLogRoutes);
app.use('/api/v1', (req, res) => {
    res.status(200).json({ message: 'Welcome to KRAMA OS API v1' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Server] KRAMA OS Backend running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map