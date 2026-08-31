import { prisma } from '../prisma';

export const evaluateEvent = async (
  workspaceId: string, 
  eventType: string, 
  eventPayload: Record<string, any>
) => {
  try {
    // 1. Fetch active rules for this event type
    const rules = await prisma.automationRule.findMany({
      where: {
        workspaceId,
        isActive: true,
        triggerType: eventType,
      }
    });

    for (const rule of rules) {
      const conditions = rule.conditions as Record<string, any> | null;
      let conditionsMet = true;

      // 2. Evaluate simple conditions (e.g., { "status": "DONE" })
      if (conditions && typeof conditions === 'object') {
        for (const [key, expectedValue] of Object.entries(conditions)) {
          if (eventPayload[key] !== expectedValue) {
            conditionsMet = false;
            break;
          }
        }
      }

      // 3. Execute actions if conditions met
      if (conditionsMet) {
        await executeAction(workspaceId, rule.actionType, rule.actionPayload as Record<string, any>, eventPayload);
      }
    }
  } catch (error) {
    console.error('Automation Engine Error:', error);
  }
};

const executeAction = async (
  workspaceId: string, 
  actionType: string, 
  actionPayload: Record<string, any>, 
  eventPayload: Record<string, any>
) => {
  switch (actionType) {
    case 'CREATE_NOTIFICATION':
      // Requires a target userId. Let's assume the event payload contains it, or fallback.
      if (eventPayload.userId) {
        await prisma.notification.create({
          data: {
            userId: eventPayload.userId, 
            title: actionPayload.title || 'Automated Alert',
            message: actionPayload.message || 'An automation rule was triggered.',
            workspaceId,
          }
        });
      }
      break;
      
    case 'ADD_COMMENT':
      if (eventPayload.taskId && eventPayload.userId) {
        await prisma.comment.create({
          data: {
            content: actionPayload.message || 'Automated comment.',
            taskId: eventPayload.taskId,
            authorId: eventPayload.userId, 
          }
        });
      }
      break;

    // Add more Zapier-like actions here in the future
    default:
      console.warn(`Unknown action type: ${actionType}`);
  }
};
