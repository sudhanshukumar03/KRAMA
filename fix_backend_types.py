import os
for path in ['apps/server/src/controllers/automation.controller.ts', 'apps/server/src/services/automation.service.ts']:
    with open(path, 'r') as f:
        text = f.read()
    
    text = text.replace("import prisma from '../prisma';", "import { prisma } from '../prisma';")
    text = text.replace("import { Request, Response } from 'express';", "import type { Request, Response } from 'express';")
    
    with open(path, 'w') as f:
        f.write(text)
