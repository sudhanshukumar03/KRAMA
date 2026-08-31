# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/TimelineView.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Find the block where useQuery is
old_block = """    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const { data: plannerData } = useQuery({ 
    queryKey: ['plannerWeek', dateStr], 
    queryFn: () => api.planner.getWeek(dateStr, dateStr) 
  });"""

content = content.replace(old_block, "")

# And place it before `if (isLoading)`
new_block = """  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const { data: plannerData } = useQuery({ 
    queryKey: ['plannerWeek', targetDateStr], 
    queryFn: () => api.planner.getWeek(targetDateStr, targetDateStr) 
  });
"""
content = content.replace(" if (isLoading)", new_block + " if (isLoading)")

# Replace dateStr in the rest of the scope
content = content.replace("queryKey: ['plannerWeek', dateStr]", "queryKey: ['plannerWeek', targetDateStr]")
content = content.replace("queryFn: () => api.planner.getWeek(dateStr, dateStr)", "queryFn: () => api.planner.getWeek(targetDateStr, targetDateStr)")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
