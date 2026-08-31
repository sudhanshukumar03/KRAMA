import codecs
import re

filepath = 'apps/web/src/components/TimelineView.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Replace the todayIssues and add useQuery for plannerWeek
search_pattern = r"const todayIssues = issues\.filter\(i => \{[\s\S]*?\}\);"

replacement = """  const dateStr = ${targetDate.getFullYear()}--;
  const { data: plannerData } = useQuery({ 
    queryKey: ['plannerWeek', dateStr], 
    queryFn: () => api.planner.getWeek(dateStr, dateStr) 
  });
  
  const timeBlocks = plannerData?.timeBlocks || [];

  const todayIssues = issues.filter(i => {
    const date = i.scheduledDate ? new Date(i.scheduledDate) : i.dueDate ? new Date(i.dueDate) : null;
    if (!date) return false;
    if (date.getTime() >= targetStart.getTime() && date.getTime() <= targetEnd.getTime()) return true;
    // Carry over incomplete tasks from the past
    if (date.getTime() < targetStart.getTime() && i.status !== "DONE") return true;
    return false;
  });

  const linkedTaskIds = new Set(timeBlocks.map((tb: any) => tb.taskId).filter(Boolean));
  const unlinkedIssues = todayIssues.filter(i => !linkedTaskIds.has(i.id));

  const agendaItems = [
    ...unlinkedIssues.map(issue => {
      const issueDate = issue.scheduledDate ? new Date(issue.scheduledDate) : issue.dueDate ? new Date(issue.dueDate) : null;
      const isCarriedOver = issueDate && issueDate.getTime() < targetStart.getTime();
      return {
        type: 'task' as const,
        id: issue.id,
        sortTime: 0,
        data: issue,
        isCarriedOver
      };
    }),
    ...timeBlocks.map((tb: any) => ({
      type: 'timeblock' as const,
      id: tb.id,
      sortTime: new Date(tb.startTime).getTime(),
      data: tb,
      linkedTask: issues.find(i => i.id === tb.taskId)
    }))
  ].sort((a, b) => a.sortTime - b.sortTime);"""

content = re.sub(search_pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
