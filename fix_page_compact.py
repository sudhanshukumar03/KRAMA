# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'r', 'utf-8') as f:
    content = f.read()

backlog_btn = '''                <button
                  onClick={() => setIsBacklogOpen(!isBacklogOpen)}
                  className={"px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all " + (isBacklogOpen ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm")}
                >
                  {isBacklogOpen ? 'Close Backlog' : 'Open Backlog'}
                </button>'''

header_call = '''          <PlannerHeader
            mode={mode}
            onModeChange={setMode}
            title={headerTitle}
            subtitle={headerSubtitle}
            onNavigate={handleNavigate}
            syncStatus={data.syncStatus}
            calendarView={calendarView}
            onCalendarViewChange={setCalendarView}
            localOnly={localOnly}
            onLocalOnlyChange={setLocalOnly}
            countryRegion={countryRegionStr}
            rightSlot={
''' + backlog_btn + '''
            }
          />'''

content = re.sub(r'<PlannerHeader.*?\s+countryRegion=\{countryRegionStr\}\s+/>', header_call, content, flags=re.DOTALL)

old_cap_wrapper = '''              <div className="flex items-center justify-between shrink-0">
                <CapacitySummary capacity={data.capacity} />
                <button
                  onClick={() => setIsBacklogOpen(!isBacklogOpen)}
                  className={"px-4 py-2 rounded-xl text-sm font-semibold border transition-all " + (isBacklogOpen ? "bg-primary text-primary-foreground border-primary" : "bg-canvas text-foreground border-border hover:bg-muted/50")}
                >
                  {isBacklogOpen ? 'Close Backlog' : 'Open Backlog'}
                </button>
              </div>'''

new_cap_wrapper = '''              <div className="shrink-0">
                <CapacitySummary capacity={data.capacity} />
              </div>'''

content = content.replace(old_cap_wrapper, new_cap_wrapper)

with codecs.open('apps/web/src/components/planner/PlannerPage.tsx', 'w', 'utf-8') as f:
    f.write(content)
