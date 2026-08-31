# -*- coding: utf-8 -*-
import codecs
import re

filepath = 'apps/web/src/components/planner/PlannerPage.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';")

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
