# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/api/client.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

milestone_apis = """
    createMilestone: (data: any) => fetchApi<any>('/planner/milestones', { method: 'POST', body: JSON.stringify(data) }),
    updateMilestone: (id: string, data: any) => fetchApi<any>(`/planner/milestones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteMilestone: (id: string) => fetchApi<any>(`/planner/milestones/${id}`, { method: 'DELETE' }),
"""

content = content.replace(
    "toggleRoutine: (data: any) => fetchApi<any>('/planner/routine-occurrences', { method: 'PATCH', body: JSON.stringify(data) })",
    "toggleRoutine: (data: any) => fetchApi<any>('/planner/routine-occurrences', { method: 'PATCH', body: JSON.stringify(data) })," + milestone_apis
)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
