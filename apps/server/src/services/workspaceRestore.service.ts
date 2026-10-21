import { randomUUID } from 'node:crypto';
import { Prisma, TimeBlockType, SyncStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { AppError } from '../utils/errors';

// A restore always creates a new, isolated personal workspace. Never deserialize
// arbitrary Prisma writes or import account/membership privileges from a file.
const id = z.string().min(8).max(200);
const text = z.string();
const date = z.string().datetime({ offset: true });
const optionalText = text.nullable().optional();
const optionalId = id.nullable().optional();
const optionalDate = date.nullable().optional();
const audit = { createdAt: date.optional(), updatedAt: date.optional(), deletedAt: optionalDate, createdBy: optionalText, updatedBy: optionalText, version: z.number().int().positive().optional() };
const base = z.object({ id, ...audit });
const scoped = base.extend({ workspaceId: id });
const metadata = z.json().nullable().optional();
const position = z.number().finite().optional();
const schemas = {
  workspace: base.extend({ name: text.min(1).max(120), metadata, productivityScore: z.number().int().optional() }),
  space: scoped.extend({ name: text, icon: optionalText, metadata, order: z.number().int().optional() }),
  goal: scoped.extend({ title: text, type: text, progress: z.number().min(0).max(100), targetDate: optionalDate, icon: optionalText, metadata, spaceId: optionalId, parentGoalId: optionalId }),
  project: scoped.extend({ name: text, problemStatement: optionalText, status: text, metadata, icon: optionalText, goalId: optionalId, spaceId: optionalId, position }),
  sprint: scoped.extend({ name: text, startDate: date, endDate: date, status: text, metadata, projectId: optionalId }),
  task: scoped.extend({ title: text, description: optionalText, status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELED']), priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']), estimateMinutes: z.number().int().nonnegative().nullable().optional(), scheduledDate: optionalDate, dueDate: optionalDate, metadata, projectId: optionalId, sprintId: optionalId, assigneeId: optionalId, blockedById: optionalId, parentTaskId: optionalId, position }),
  habit: scoped.extend({ name: text, icon: optionalText, streak: z.number().int().nonnegative(), bestStreak: z.number().int().nonnegative(), expectedDurationMinutes: z.number().int().nullable().optional(), category: z.enum(['HEALTH', 'LEARNING', 'PRODUCTIVITY', 'MINDFULNESS', 'FINANCE', 'OTHER']), difficulty: z.enum(['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'EXTREME']), cadence: text, scheduledDays: z.array(z.number().int().min(0).max(6)), metadata, linkedGoalId: optionalId }),
  folder: z.object({ id, spaceId: id, parentFolderId: optionalId, name: text, color: optionalText, order: z.number().int() }),
  document: base.extend({ spaceId: id, folderId: optionalId, parentId: optionalId, projectId: optionalId, title: text, subtitle: optionalText, icon: optionalText, contentJson: z.json(), contentMarkdown: text, statusBadges: z.array(text), documentType: z.enum(['SPEC', 'NOTE', 'MEETING', 'IDEA', 'RFC', 'GENERAL']), isFavorite: z.boolean(), wordCount: z.number().int().nonnegative(), charCount: z.number().int().nonnegative(), createdById: id, lastEditedById: id }),
  documentVersion: z.object({ id, documentId: id, versionNumber: z.number().int().positive(), contentJson: z.json(), editedById: id, createdAt: date }),
  goalProgressSnapshot: z.object({ id, goalId: id, progress: z.number().min(0).max(100), notes: optionalText, date, createdAt: date }),
  milestone: z.object({ id, createdAt: date, updatedAt: date, title: text, date, completed: z.boolean(), projectId: id, userId: id }),
  habitCompletion: z.object({ id, habitId: id, userId: id, date, completedAt: date, offSchedule: z.boolean(), notes: optionalText, metadata }),
  focusSession: z.object({ id, startTime: date, endTime: optionalDate, duration: z.number().int().nonnegative(), completed: z.boolean(), type: text, taskId: optionalId, projectId: optionalId, userId: id, workspaceId: id, createdAt: date }),
  timeBlock: z.object({ id, createdAt: date, updatedAt: date, userId: id, workspaceId: optionalId, title: text, date, startTime: date, endTime: date, type: z.enum(TimeBlockType), taskId: optionalId, projectId: optionalId, notes: optionalText, syncStatus: z.enum(SyncStatus) }),
  dailyLog: scoped.extend({ date, wins: z.array(text), blockers: z.array(text), mood: optionalText, energy: optionalText, deepWorkMinutes: z.number().int().nullable().optional(), notes: optionalText, metadata, userId: id }),
  sprintReport: z.object({ id, sprintId: id, workspaceId: id, generatedAt: date, tasksCompleted: z.number().int(), tasksPlanned: z.number().int(), metadata }),
  tag: z.object({ id, workspaceId: id, name: text, color: optionalText }),
  label: z.object({ id, workspaceId: id, name: text, color: text }),
  comment: z.object({ id, content: text, taskId: optionalId, authorId: id, createdAt: date, updatedAt: date }),
  documentTag: z.object({ documentId: id, tagId: id }),
  labelsOnTasks: z.object({ taskId: id, labelId: id }),
  activityLog: z.object({ id, action: text, entityType: text, entityId: text, metadata, userId: id, workspaceId: id, createdAt: date }),
  notification: z.object({ id, userId: id, workspaceId: id, title: text, message: text, read: z.boolean(), actionUrl: optionalText, metadata, createdAt: date }),
  entityLink: z.object({ id, sourceType: z.enum(['DOCUMENT', 'PROJECT', 'TASK']), sourceId: id, targetType: z.enum(['DOCUMENT', 'PROJECT', 'TASK']), targetId: id, linkType: z.enum(['REFERENCE', 'RELATED']), createdById: id, createdAt: date }),
};
type Model = keyof typeof schemas;
type Row = Record<string, any>;
const refs: Record<string, Model> = { workspaceId: 'workspace', spaceId: 'space', projectId: 'project', goalId: 'goal', parentGoalId: 'goal', linkedGoalId: 'goal', sprintId: 'sprint', blockedById: 'task', parentTaskId: 'task', taskId: 'task', habitId: 'habit', folderId: 'folder', parentFolderId: 'folder', parentId: 'document', documentId: 'document', tagId: 'tag', labelId: 'label' };
const userFields = new Set(['userId', 'assigneeId', 'authorId', 'createdBy', 'updatedBy', 'createdById', 'lastEditedById', 'editedById']);
const delayed = new Set(['spaceId:goal', 'spaceId:project', 'parentGoalId:goal', 'parentFolderId:folder', 'parentId:document', 'blockedById:task', 'parentTaskId:task']);
const fail = (message: string): never => { throw new AppError(message, 400, 'INVALID_BACKUP'); };

export function prepareWorkspaceRestore(input: unknown, userId: string) {
  const envelope = z.object({ format: z.literal('krama-workspace-backup'), formatVersion: z.literal(2), workspace: z.record(z.string(), z.any()), entityLinks: z.array(z.any()) }).parse(input);
  const workspace = envelope.workspace;
  const members = z.array(z.object({ user: z.object({ id }), role: text })).length(1, 'Restore supports personal backups with one member.').parse(workspace.members);
  const originalUser = members[0]!.user.id;
  const rows = Object.fromEntries(Object.keys(schemas).map(model => [model, [] as Row[]])) as Record<Model, Row[]>;
  function add(model: Model, raw: unknown) { rows[model].push(schemas[model].parse(raw)); }
  function list(parent: Row, key: string): Row[] { return z.array(z.record(z.string(), z.any())).parse(parent[key]); }
  add('workspace', workspace);
  for (const [key, model] of Object.entries({ spaces: 'space', goals: 'goal', projects: 'project', sprints: 'sprint', tasks: 'task', habits: 'habit', tags: 'tag', labels: 'label', timeBlocks: 'timeBlock', focusSessions: 'focusSession', dailyLogs: 'dailyLog', sprintReports: 'sprintReport', activityLogs: 'activityLog', notifications: 'notification' }) as [string, Model][]) {
    for (const row of list(workspace, key)) add(model, row);
  }
  for (const space of list(workspace, 'spaces')) {
    for (const folder of list(space, 'folders')) { if (folder.spaceId !== space.id) fail('A folder belongs to a different space.'); add('folder', folder); }
    for (const doc of list(space, 'documents')) {
      if (doc.spaceId !== space.id) fail('A document belongs to a different space.');
      add('document', doc);
      for (const version of list(doc, 'versions')) { if (version.documentId !== doc.id) fail('Invalid document version.'); add('documentVersion', version); }
      for (const tag of list(doc, 'tags')) { if (tag.documentId !== doc.id) fail('Invalid document tag.'); add('documentTag', tag); }
    }
  }
  for (const [collection, nested, model, fk] of [['goals', 'snapshots', 'goalProgressSnapshot', 'goalId'], ['projects', 'milestones', 'milestone', 'projectId'], ['habits', 'completions', 'habitCompletion', 'habitId'], ['tasks', 'comments', 'comment', 'taskId'], ['tasks', 'labels', 'labelsOnTasks', 'taskId']] as const) {
    for (const parent of list(workspace, collection)) for (const child of list(parent, nested)) { if (child[fk] !== parent.id) fail('Invalid nested backup record.'); add(model, child); }
  }
  envelope.entityLinks.forEach(row => add('entityLink', row));
  if (Object.values(rows).reduce((sum, value) => sum + value.length, 0) > 50000) fail('This backup is too large to restore in one operation.');

  const ids = new Map<string, string>();
  const modelIds = new Map<Model, Set<string>>();
  for (const [model, records] of Object.entries(rows) as [Model, Row[]][]) {
    const set = new Set<string>(); modelIds.set(model, set);
    for (const row of records) if (row.id) {
      if (ids.has(row.id)) fail('Backup contains duplicate record IDs.');
      ids.set(row.id, randomUUID()); set.add(row.id);
    }
  }
  for (const [model, field] of [['goal', 'parentGoalId'], ['folder', 'parentFolderId'], ['document', 'parentId'], ['task', 'blockedById'], ['task', 'parentTaskId']] as const) {
    const lookup = new Map(rows[model].map(row => [row.id, row]));
    for (const row of rows[model]) {
      const seen = new Set<string>([row.id]);
      let parent = row[field];
      while (parent) {
        if (seen.has(parent)) fail('Backup contains a circular hierarchy or dependency.');
        seen.add(parent);
        const parentRow = lookup.get(parent);
        if (row.spaceId && parentRow?.spaceId !== row.spaceId) fail('A hierarchy crosses document spaces.');
        parent = parentRow?.[field];
      }
    }
  }
  const folders = new Map(rows.folder.map(row => [row.id, row]));
  for (const doc of rows.document) if (doc.folderId && folders.get(doc.folderId)?.spaceId !== doc.spaceId) fail('A document folder belongs to a different space.');
  const mapText = (value: string) => {
    if (ids.has(value)) return ids.get(value)!;
    // Internal links may occur in editor text, notifications and Markdown.
    return value.replace(/(\/app\/[^\s"<>]*|krama:\/\/[^\s"<>]*)/g, link => {
      return link.replace(/[A-Za-z0-9_-]{8,200}/g, token => ids.get(token) || token);
    });
  };
  function remapJson(value: any): any {
    if (typeof value === 'string') return mapText(value);
    if (Array.isArray(value)) return value.map(remapJson);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [ids.get(key) || key, remapJson(item)]));
    return value;
  }
  const patches: { model: Model; id: string; data: Row }[] = [];
  const prepared = Object.fromEntries(Object.keys(rows).map(model => [model, [] as Row[]])) as Record<Model, Row[]>;
  for (const [model, records] of Object.entries(rows) as [Model, Row[]][]) for (const row of records) {
    const data: Row = {};
    const patch: Row = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'workspaceId' && value !== workspace.id) fail('Backup contains data outside its workspace.');
      if (userFields.has(key)) {
        if (['userId', 'assigneeId', 'authorId'].includes(key) && value && value !== originalUser) fail('This personal backup contains another user’s history.');
        data[key] = value ? userId : null; continue;
      }
      if (refs[key] && value) {
        if (!modelIds.get(refs[key])?.has(value)) fail(`Backup has a missing ${key} reference.`);
        if (delayed.has(`${key}:${model}`)) { data[key] = null; patch[key] = ids.get(value); }
        else data[key] = ids.get(value);
      } else if (key === 'id') data.id = ids.get(value);
      else if (value === null) data[key] = value;
      else if (['createdAt', 'updatedAt', 'deletedAt', 'targetDate', 'scheduledDate', 'dueDate', 'date', 'completedAt', 'startTime', 'endTime', 'startDate', 'endDate', 'generatedAt'].includes(key)) data[key] = new Date(value);
      else data[key] = remapJson(value);
    }
    if (model === 'entityLink') for (const side of ['source', 'target']) {
      const target = ({ DOCUMENT: 'document', PROJECT: 'project', TASK: 'task' } as const)[row[`${side}Type`] as 'DOCUMENT' | 'PROJECT' | 'TASK'];
      if (!modelIds.get(target)?.has(row[`${side}Id`])) fail('Backup has an invalid entity link.');
      data[`${side}Id`] = ids.get(row[`${side}Id`]);
    }
    if (model === 'workspace') { data.name = `${workspace.name.slice(0, 100)} (restored)`; data.deletedAt = null; data.createdBy = userId; data.updatedBy = userId; }
    if (model === 'timeBlock') data.syncStatus = 'LOCAL_ONLY';
    if (model === 'habit' && typeof data.metadata?.streakUserId === 'string') data.metadata.streakUserId = userId;
    // Nullable JSON columns distinguish database NULL from a JSON null.
    if (data.metadata === null) data.metadata = Prisma.DbNull;
    prepared[model].push(data);
    if (Object.keys(patch).length) patches.push({ model, id: data.id, data: patch });
  }
  return { rows: prepared, patches, workspaceId: ids.get(workspace.id)! };
}

export async function restoreWorkspaceBackup(input: unknown, userId: string) {
  const plan = prepareWorkspaceRestore(input, userId);
  return prisma.$transaction(async tx => {
    const order: Model[] = ['workspace', 'space', 'goal', 'project', 'sprint', 'task', 'habit', 'folder', 'document', 'tag', 'label', 'goalProgressSnapshot', 'milestone', 'habitCompletion', 'documentVersion', 'documentTag', 'comment', 'labelsOnTasks', 'focusSession', 'timeBlock', 'dailyLog', 'sprintReport', 'activityLog', 'notification', 'entityLink'];
    // Bound the driver's parameter/serialization work for long habit histories.
    // Every batch still belongs to this transaction: a failed batch rolls back
    // the entire new workspace, including already inserted records.
    for (const model of order) {
      const records = plan.rows[model];
      for (let offset = 0; offset < records.length; offset += 500) {
        await (tx[model] as any).createMany({ data: records.slice(offset, offset + 500) });
      }
    }
    for (const patch of plan.patches) await (tx[patch.model] as any).update({ where: { id: patch.id }, data: patch.data });
    await tx.workspaceMember.create({ data: { workspaceId: plan.workspaceId, userId, role: 'OWNER' } });
    await tx.$executeRaw`UPDATE "Document" d SET "searchVector" = to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(d."contentMarkdown", '')) FROM "Space" s WHERE d."spaceId" = s.id AND s."workspaceId" = ${plan.workspaceId}`;
    return tx.workspace.findUniqueOrThrow({ where: { id: plan.workspaceId } });
  }, { timeout: 60000 });
}
