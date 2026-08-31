# -*- coding: utf-8 -*-
import codecs

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '''            <PlannerHeader
              mode={mode}
              onModeChange={setMode}
              title={headerTitle}
              subtitle={headerSubtitle}''',
    '''            <PlannerHeader
              mode={mode}
              onModeChange={setMode}
              title={headerTitle}
              subtitle={headerSubtitle}
              weekRangeLabel={weekRangeLabel}'''
)

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
