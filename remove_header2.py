# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/AppShell.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

pattern = r"\s*\{\/\*\s*TOP NAVIGATION \(Sticky Glass\)\s*\*\/\}\s*<header[\s\S]*?</header>"
new_content = re.sub(pattern, "", content)

if new_content != content:
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(new_content)
    print("Header removed successfully")
else:
    print("Pattern not found")
