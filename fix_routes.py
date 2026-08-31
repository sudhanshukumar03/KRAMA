with open('apps/server/src/index.ts', 'r') as f:
    text = f.read()

text = text.replace(
    "import workspaceRoutes from './routes/workspace.routes';",
    "import workspaceRoutes from './routes/workspace.routes';\nimport automationRoutes from './routes/automation.routes';"
)

text = text.replace(
    "app.use('/api/workspaces', workspaceRoutes);",
    "app.use('/api/workspaces', workspaceRoutes);\napp.use('/api/automations', automationRoutes);"
)

with open('apps/server/src/index.ts', 'w') as f:
    f.write(text)
