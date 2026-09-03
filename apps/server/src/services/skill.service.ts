import { prisma } from '../prisma';

export class SkillService {
  /**
   * Calculate overview metrics and return active skills with relationship counts
   */
  static async getOverview(userId: string) {
    const skills = await prisma.skill.findMany({
      where: { userId },
      include: {
        _count: {
          select: { goals: true, projects: true, tasks: true, habits: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const totalSkills = skills.length;
    
    const totalLevel = skills.reduce((sum, s) => sum + (s.currentLevel || 0), 0);
    const averageLevel = totalSkills > 0 ? Number((totalLevel / totalSkills).toFixed(1)) : 0;

    const inProgress = skills.filter(s => 
      (s.currentLevel || 0) > 0 && 
      (s.currentLevel || 0) < (s.targetLevel || 5)
    ).length;

    let goalProgress = null;
    const skillGoal = await prisma.goal.findFirst({
      where: {
        workspace: { members: { some: { userId } } },
        type: 'SKILL'
      }
    });

    if (skillGoal) {
      const metadata = skillGoal.metadata as any;
      const target = metadata?.targetSkillCount || 10;
      const completed = skills.filter(s => (s.currentLevel || 0) >= (s.targetLevel || 5)).length;
      goalProgress = {
        current: completed,
        target: target,
        deadline: skillGoal.targetDate
      };
    }

    const topGaps = [...skills]
      .map(s => ({
        ...s,
        gap: (s.targetLevel || 5) - (s.currentLevel || 0)
      }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 5);

    return {
      metrics: {
        totalSkills,
        averageLevel,
        inProgress,
        goalProgress
      },
      skills,
      topGaps,
      recentActivity: [] 
    };
  }

  static async getById(userId: string, skillId: string) {
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });
    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        goals: { where: { workspaceId: { in: workspaceIds } } },
        projects: { where: { workspaceId: { in: workspaceIds } } },
        tasks: { where: { workspaceId: { in: workspaceIds } } },
        habits: { where: { workspaceId: { in: workspaceIds } } }
      }
    });

    if (!skill || skill.userId !== userId) {
      throw new Error('Not found or unauthorized');
    }

    return skill;
  }

  static async create(userId: string, data: any) {
    return prisma.skill.create({
      data: {
        ...data,
        userId
      }
    });
  }

  static async update(userId: string, skillId: string, data: any) {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || skill.userId !== userId) {
      throw new Error('Not found or unauthorized');
    }
    return prisma.skill.update({
      where: { id: skillId },
      data
    });
  }

  static async delete(userId: string, skillId: string) {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || skill.userId !== userId) {
      throw new Error('Not found or unauthorized');
    }
    return prisma.skill.delete({ where: { id: skillId } });
  }

  static async validateSkillLinking(userId: string, workspaceId: string, skillIds: string[]) {
    if (!skillIds || skillIds.length === 0) return true;

    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    });
    if (!membership) {
      throw new Error('User does not have access to this workspace');
    }

    const skills = await prisma.skill.findMany({
      where: { id: { in: skillIds } }
    });

    if (skills.length !== skillIds.length) {
       throw new Error('One or more skills do not exist');
    }

    for (const s of skills) {
      if (s.userId !== userId) {
        throw new Error('Cannot link a skill belonging to another user');
      }
    }

    return true;
  }

    static async getUserSkillsForAiContext(userId: string) {
    const skills = await prisma.skill.findMany({
      where: { userId },
      include: {
        _count: {
          select: { goals: true, projects: true, tasks: true, habits: true }
        }
      }
    });

    return skills.map(s => {
      const gap = (s.targetLevel || 5) - (s.currentLevel || 0);
      const status = (s.currentLevel || 0) === 0 ? 'NOT_STARTED' : 
                     (s.currentLevel || 0) >= (s.targetLevel || 5) ? 'COMPLETED' : 'IN_PROGRESS';
      
      return s.name + ' (Level: ' + s.currentLevel + '/' + s.targetLevel + ', Gap: ' + gap + ', Status: ' + status + ') [Links - Goals: ' + s._count.goals + ', Projects: ' + s._count.projects + ', Tasks: ' + s._count.tasks + ', Habits: ' + s._count.habits + ']';
    }).join('\n');
  }
}
