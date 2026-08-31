# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/AppShell.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# I will find the `<header...>` and its corresponding `</header>` and remove it.
# Let's find the exact text block.
start_idx = content.find('   {/* TOP NAVIGATION (Sticky Glass) */}')
if start_idx != -1:
    end_idx = content.find('</header>', start_idx)
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx + len('</header>'):]
        with codecs.open(filepath, 'w', 'utf-8') as f:
            f.write(content)
        print("Header removed successfully")
    else:
        print("Could not find </header>")
else:
    print("Could not find start index")
