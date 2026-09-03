import type { Request, Response } from 'express';
import { SkillService } from '../services/skill.service';

export const getOverview = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = await SkillService.getOverview(userId);
    return res.json(data);
  } catch (error: any) {
    require('fs').appendFileSync('error_log.txt', error.stack + '\n'); return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDetail = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const skill = await SkillService.getById(userId, req.params.id as string);
    return res.json(skill);
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const createSkill = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const skill = await SkillService.create(userId, req.body);
    return res.status(201).json(skill);
  } catch (error: any) {
    require('fs').appendFileSync('error_log.txt', error.stack + '\n'); return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSkill = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updated = await SkillService.update(userId, req.params.id as string, req.body);
    return res.json(updated);
  } catch (error: any) {
    require('fs').appendFileSync('error_log.txt', error.stack + '\n'); return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSkill = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await SkillService.delete(userId, req.params.id as string);
    return res.json({ success: true });
  } catch (error: any) {
    require('fs').appendFileSync('error_log.txt', error.stack + '\n'); return res.status(500).json({ success: false, message: error.message });
  }
};

