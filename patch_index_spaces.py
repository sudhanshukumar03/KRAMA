with open('apps/server/src/index.ts', 'r') as f:
    text = f.read()

if 'spaceRoutes' not in text:
    text = text.replace("import pageRoutes from './routes/page.routes';", "import pageRoutes from './routes/page.routes';\nimport spaceRoutes from './routes/space.routes';")
    text = text.replace("app.use('/api/v1/pages', pageRoutes);", "app.use('/api/v1/pages', pageRoutes);\napp.use('/api/v1/spaces', spaceRoutes);")
    with open('apps/server/src/index.ts', 'w') as f:
        f.write(text)
