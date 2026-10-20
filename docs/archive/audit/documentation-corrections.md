# Corrections to the original repair instructions

The repair instructions were reviewed for consistency before they were used. This record combines the duplicate correction logs that previously appeared in two folders. It concerns errors in those documents, rather than a separate application test run.

## Workspace assumptions

The instructions treated `req.workspaceId` as if its presence proved that membership had already been checked. A workspace value in a request is only a selected scope; its type or existence does not prove that the authenticated user belongs to it. The repair needed to follow the middleware and the resource query before deciding where validation belonged.

The same distinction applies to a client-supplied header. Scoping a query to that header does not replace checking membership in the selected workspace.

## References and execution order

The Focus chapter contained repeated sections and references to material that was not present. Its database cross-reference also pointed to a stale section. The review removed those references and put schema requirements in the database record.

The `Project`–`Document` relation had been attributed to the habits and goals work, although it belonged to the schema and document work. A separate reference to “section 13” meant the thirteenth action in a procedure, not a thirteenth documentation chapter.

The cleanup order needed one explicit dependency: the old focus widget had to remain until its replacement was ready. Removing apparently obsolete code before its consumer had been replaced would have created a regression.

## Proposed helpers and existing conventions

Some instructions used `NotFoundError` as though the project already exposed that exact error class. A proposed fix must use the repository's actual error convention or explain the new abstraction it introduces.

Likewise, `resolveTimerPreferences` was a proposed helper, not an existing function that could simply be imported. The revised explanation distinguished the intended behavior from the code already available.

## Limits of the review

This pass checked numbering, code fences, dependencies and implementation assumptions. It did not establish that the live application satisfied every instruction. The later [repair records](README.md) describe the implementation and verification history separately.
