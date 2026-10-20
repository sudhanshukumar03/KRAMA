# Remaining logic repair plan

1. Promote the two reproduced failures to maintained live regressions. Cover future dates, unscheduled overdue work, explicit current-day priorities/reservations, individual recovery, project Undo and concurrent project deletion.
2. Make the scheduled work date govern automatic Focus eligibility; overdue deadlines remain visible in Dashboard/Planner, while deliberate current-day priority or reservation choices override the future work date.
3. Reconcile inactive project associations when an individual task is restored, without reviving its deleted project. Serialize the project decision against project deletion and preserve valid associations and prior deletion history.
4. Run the focused cases, unit/database integration suites, build/lint and production startup smoke. Run the full live suite against the final implementation, fix any attributable regression, then verify the final results and clean up only audit-owned processes.
5. Recheck local migration/Compose configuration without modifying existing data. Report missing object-storage credentials and unverified external AI/production operations separately from local passing checks.
