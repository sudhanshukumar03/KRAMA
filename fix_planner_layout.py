import os

page_path = 'apps/web/src/components/planner/PlannerPage.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    page_code = f.read()

# Replace the root container to allow native page scrolling instead of internal scrolling
page_code = page_code.replace(
    'className="p-4 md:p-6 bg-background h-[calc(100vh-140px)] flex gap-6 overflow-hidden box-border"',
    'className="p-4 md:p-6 bg-background min-h-screen flex gap-6 box-border"'
)

# Remove the h-full overflow-hidden from the main column
page_code = page_code.replace(
    'className="flex-1 flex flex-col min-w-0 h-full"',
    'className="flex-1 flex flex-col min-w-0"'
)

# Remove the internal scrolling from the planner plan view
page_code = page_code.replace(
    'className="mt-6 flex flex-col flex-1 min-h-0"',
    'className="mt-6 flex flex-col"'
)
page_code = page_code.replace(
    'className="flex flex-col gap-4 flex-1 min-h-0"',
    'className="flex flex-col gap-4"'
)
page_code = page_code.replace(
    'className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden border border-border"',
    'className="flex flex-col rounded-xl border border-border bg-white"'
)

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_code)
