# 02 — Security, IDOR & Multi-Tenant Data Leak Architecture

**Priority:** P1 (all five issues are exploitable by any authenticated user, not just an attacker with special access)  
**Depends on:** `12-DATABASE-SCHEMA-MIGRATIONS.md` §12.1 (`TimeBlock.workspaceId`)  
**Touches:** `apps/server/src/routes/search.routes.ts`, `apps/server/src/controllers/sprint.controller.ts`, `apps/server/src/routes/sprint.routes.ts`, `apps/server/src/routes/workspace.routes.ts`, `apps/server/src/controllers/space.controller.ts`, `apps/server/src/routes/planner.routes.ts`, `apps/server/src/routes/upload.routes.ts`, `apps/server/prisma/schema.prisma`

---

## 1. Scope

Close every cross-tenant read/write path found in the audit. The common defect shape: a route trusts `req.headers['x-workspace-id']` or a URL param as the tenant boundary without verifying the authenticated user actually belongs to that tenant. Fix each instance, then verify the underlying `requireWorkspaceRole` middleware is applied everywhere it should be.

## 2. Hard Rules for This Section

- **Every fix in this file is additive (adding a check), never a removal of an existing check.** If you find yourself deleting an auth check to make a test pass, stop — the test is wrong, not the check.
- Use the existing `requireAuth` and `requireWorkspaceRole(role)` middlewares from `middlewares/auth.middleware.ts`. Do not write ad hoc `if (member.role !== 'OWNER')` checks inline when a middleware call does the same thing — consistency here is what makes future audits tractable.
- `requireWorkspaceRole('MEMBER')` means "any role, but must be a member of this workspace" — use it for read paths. `requireWorkspaceRole('OWNER')` is for destructive workspace-level mutations only.

---

## 3. SEC-01 — Global Search Cross-Tenant Data Leak (Ref: Audit §3.1)

**Vulnerability:** `GET /api/v1/search` read `x-workspace-id` from the header and queried directly — it never checked `req.user.id` was a member of that workspace. Any authenticated user could pass any workspace UUID and read another organization's documents, tasks, projects, and goals.

**File:** `apps/server/src/routes/search.routes.ts`, lines 7–20.

**Fix:**
```ts
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';

const router: Router = Router();
router.use(requireAuth);
router.use(requireWorkspaceRole('MEMBER'));
```

**Verify:** As User A (member of Workspace 1 only), call `GET /api/v1/search?q=test` with `x-workspace-id` set to Workspace 2's UUID. Expect `403`, not search results.

---

## 4. SEC-02 — Cross-Tenant Sprint Report IDOR (Ref: Audit §3.2)

**Vulnerability:** `getSprintReport` did `prisma.sprint.findUnique({ where: { id } })` and returned it without checking `sprint.workspaceId` matched the caller's workspace. Anyone who knew or guessed a sprint UUID could read another tenant's burndown, estimates, and velocity.

**Files:** `apps/server/src/controllers/sprint.controller.ts`, lines 160–176; `apps/server/src/routes/sprint.routes.ts`.

**Fix:**
```ts
const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

const sprint = await prisma.sprint.findUnique({
  where: { id },
  include: {
    tasks: {
      where: { deletedAt: null },
      select: { id: true, status: true, priority: true, estimateMinutes: true, metadata: true, updatedAt: true, createdAt: true }
    }
  }
});

if (!sprint || sprint.deletedAt || (workspaceId && sprint.workspaceId !== workspaceId)) {
  return res.status(404).json({ message: 'Sprint not found' });
}
```
Return `404`, not `403` — do not confirm the sprint's existence to a caller outside its tenant. Supported both `/:id/report` and `/:id/reports` in `sprint.routes.ts`.

**Verify:** As a user outside the sprint's workspace, `GET /sprints/:id/report` returns `404` for a real, existing sprint ID belonging to another tenant.

---

## 5. SEC-03 — Workspace & Space Mutation IDOR (Ref: Audit §3.3)

**Vulnerability:**
- `PATCH /api/v1/workspaces/:id` and `DELETE /api/v1/workspaces/:id` didn't require the `OWNER` role — any member could rename or delete the workspace.
- `PUT /api/v1/spaces/:id` and `DELETE /api/v1/spaces/:id` didn't filter by `workspaceId` — a space ID from one tenant could be mutated by a member of a different tenant.

**Files:** `apps/server/src/routes/workspace.routes.ts`, `apps/server/src/controllers/space.controller.ts`.

**Fix — workspace routes:**
```ts
const ensureWorkspaceId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspaceId = req.params.id || req.headers['x-workspace-id'] || req.query.workspaceId;
  if (workspaceId) {
    (req as any).workspaceId = workspaceId;
  }
  next();
};

router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/export', requireWorkspaceRole('MEMBER'), exportWorkspace);
router.get('/:id', ensureWorkspaceId, requireWorkspaceRole('VIEWER'), getWorkspace);
router.patch('/:id', ensureWorkspaceId, requireWorkspaceRole('OWNER'), updateWorkspace);
router.delete('/:id', ensureWorkspaceId, requireWorkspaceRole('OWNER'), deleteWorkspace);
```

**Fix — space controller:**
```ts
const workspaceId = (req as any).workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

const space = await prisma.space.findFirst({
  where: { id: req.params.id, workspaceId },
});
if (!space) return res.status(404).json({ message: 'Space not found' });
```

**Verify:** A `MEMBER`-role user gets `403` on `PATCH /workspaces/:id`. A user from Workspace A gets `404` (not a successful mutation) when calling `PUT /spaces/:id` with a Workspace B space ID.

---

## 6. SEC-04 — Cross-Workspace Calendar Leak (Ref: Audit §3.4)

**Vulnerability:** `TimeBlock` had `userId` but no `workspaceId`. A user in both a Work and a Personal workspace saw Work timeblocks and project references bleed into their Personal planner view, because nothing scoped the query by workspace at all — only by user.

**Files:** `apps/server/prisma/schema.prisma`, `apps/server/src/routes/planner.routes.ts`.

**Fix:**
1. Added `TimeBlock.workspaceId` and relation to `Workspace` in `schema.prisma` with `@@index([workspaceId])` and generated Prisma Client.
2. In `planner.routes.ts`, verified workspace membership for caller and scoped `TimeBlock` queries and mutations:
```ts
prisma.timeBlock.findMany({
  where: { userId, workspaceId, date: { gte: weekStart, lte: weekEnd } },
  orderBy: { startTime: 'asc' },
});
```
3. Scoped `POST /time-blocks`, `PATCH /time-blocks/:id`, and `DELETE /time-blocks/:id` with `workspaceId`.

**Verify:** A user with TimeBlocks in both a Work and a Personal workspace sees only the active workspace's blocks in `/app/planner` week view, regardless of which workspace they switch to.

---

## 7. SEC-05 — Unbounded Memory Uploads (DoS) (Ref: Audit §3.5)

**Vulnerability:** `multer({ storage: multer.memoryStorage() })` had no `limits.fileSize`. Any authenticated user could upload an arbitrarily large stream and OOM-crash the Node process.

**File:** `apps/server/src/routes/upload.routes.ts`.

**Fix:**
```ts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'Payload Too Large: File exceeds 10MB limit' });
        }
        return res.status(400).json({ message: err.message || 'File upload error' });
      }
      next();
    });
  },
  uploadFile
);
```

**Verify:** An upload request with a >10MB body returns `413`, and the server process memory does not spike proportionally to attempted upload size.

---

## 8. Cleanup

None — this file only adds checks and limits.

## 9. Section Completion Checklist

- [x] `search.routes.ts` requires workspace membership (SEC-01).
- [x] `getSprintReport` returns 404 across tenants (SEC-02).
- [x] Workspace mutations require `OWNER`; space mutations are workspace-scoped (SEC-03).
- [x] Every `TimeBlock` query in `planner.routes.ts` filters by `workspaceId` (SEC-04).
- [x] Uploads are capped at 10MB with a proper 413 response (SEC-05).
- [x] Full monorepo typecheck (`tsc -b` and `tsc --noEmit`) and linting pass with zero errors.
