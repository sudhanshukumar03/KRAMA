# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/server/src/routes/planner.routes.ts'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("where: { id: req.params.id, userId },", "where: { id: req.params.id as string, userId },")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
