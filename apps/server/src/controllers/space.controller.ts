import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export const listSpaces = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const spaces = await prisma.space.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(spaces);
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createSpace = async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
    
    const { name, icon, metadata } = req.body;
    const space = await prisma.space.create({
      data: {
        name,
        icon,
        metadata: metadata || {},
        workspaceId
      }
    });
    return res.status(201).json(space);
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSpace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, metadata } = req.body;
    
    const space = await prisma.space.update({
      where: { id },
      data: { name, icon, metadata }
    });
    return res.status(200).json(space);
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteSpace = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.space.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Space Controller Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
