import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const ruleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  triggerType: z.string(),
  conditions: z.any().optional(),
  actionType: z.string(),
  actionPayload: z.any(),
});

export const listRules = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string;
    const rules = await prisma.automationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string;
    const data = ruleSchema.parse(req.body);

    const rule = await prisma.automationRule.create({
      data: {
        ...data,
        workspaceId
      }
    });

    res.status(201).json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateRule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.headers['x-workspace-id'] as string;
    const data = ruleSchema.partial().parse(req.body);

    const rule = await prisma.automationRule.updateMany({
      where: { id, workspaceId },
      data
    });

    if (rule.count === 0) return res.status(404).json({ error: 'Rule not found' });

    const updated = await prisma.automationRule.findUnique({ where: { id } });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.headers['x-workspace-id'] as string;

    const result = await prisma.automationRule.deleteMany({
      where: { id, workspaceId }
    });

    if (result.count === 0) return res.status(404).json({ error: 'Rule not found' });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
