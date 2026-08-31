# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/api/client.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

if "oauth:" not in content:
    pattern = r"  planner: \{"
    replacement = "  oauth: {\n    connectGoogle: () => fetchApi<any>('/oauth/google/connect', { method: 'POST' }),\n    getStatus: () => fetchApi<any>('/oauth/status', { method: 'GET' }),\n  },\n  planner: {"
    content = re.sub(pattern, replacement, content)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
