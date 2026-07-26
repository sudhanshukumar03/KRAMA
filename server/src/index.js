import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import spaceRoutes from './routes/spaces';
import pageRoutes from './routes/pages';
import goalRoutes from './routes/goals';
import projectRoutes from './routes/projects';
import issueRoutes from './routes/issues';
import sprintRoutes from './routes/sprints';
import roadmapItemRoutes from './routes/roadmapItems';
import habitRoutes from './routes/habits';
import dailyLogRoutes from './routes/dailyLogs';
import snapshotRoutes, { startSnapshotScheduler } from './routes/snapshots';
import searchRoutes from './routes/search';
import decisionRoutes from './routes/decisions';
import { config } from './config';
dotenv.config();
const app = express();
const port = config.port;
app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
// Health Check
app.get('/', (_req, res) => {
    res.send('Krama OS API is running');
});
// Authentication Routes
app.use('/api/auth', authRoutes);
// Protected REST CRUD Routes
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/spaces', spaceRoutes);
app.use('/api/v1/pages', pageRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/issues', issueRoutes);
app.use('/api/v1/sprints', sprintRoutes);
app.use('/api/v1/roadmap-items', roadmapItemRoutes);
app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/daily-logs', dailyLogRoutes);
app.use('/api/v1/snapshots', snapshotRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/decisions', decisionRoutes);
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Krama OS Server is running on port ${port}`);
        startSnapshotScheduler();
    });
}
export default app;
//# sourceMappingURL=index.js.map