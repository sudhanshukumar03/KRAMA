# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/AppShell.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# Import
if "import { FocusTimerWidget } from './FocusTimerWidget';" not in content:
    pattern = r"import \{ CommandPalette \} from '\./CommandPalette';\n?"
    replacement = "import { CommandPalette } from './CommandPalette';\nimport { FocusTimerWidget } from './FocusTimerWidget';\n"
    content = re.sub(pattern, replacement, content)

# Mount
if "<FocusTimerWidget />" not in content:
    pattern = r"<CommandPalette />\n?"
    replacement = "<CommandPalette />\n      <FocusTimerWidget />\n"
    content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
