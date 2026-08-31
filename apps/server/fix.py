import re

with open('src/services/google-calendar.service.ts', 'r') as f:
    service = f.read()

service = service.replace('.toISOString()', '')

with open('src/services/google-calendar.service.ts', 'w') as f:
    f.write(service)

