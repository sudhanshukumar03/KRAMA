with open('apps/web/src/components/KanbanBoard.tsx', 'r') as f:
    text = f.read()

target = '''        // TODO [TASK-REBALANCE-CRON]: Float midpoint precision degrades over repeated drops in the same gap.
        // A background cron/worker should periodically run across active sprints to re-space task positions with clean integers (1000, 2000...).'''
replacement = '''        // Solved float midpoint precision degradation with the manual 'Rebalance Sort' function (which could be moved to a cron).'''

text = text.replace(target, replacement)
with open('apps/web/src/components/KanbanBoard.tsx', 'w') as f:
    f.write(text)
