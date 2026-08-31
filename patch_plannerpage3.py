# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("onClickTask={handleClickTask}", "onClickTask={handleClickTask}\n                  onAddMilestone={() => setMilestoneModalOpen(true)}")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
