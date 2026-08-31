import codecs

def fix_matrix(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Replace the bad tab escape
    content = content.replace('id: \	ask-\\,', 'id: \	ask-\\,')
    # Or just use regex to fix any backtick string issues
    import re
    content = re.sub(r'id: \t?ask-', 'id: 	ask-', content)
    content = re.sub(r'id: \\\s*ask-', 'id: 	ask-', content)
    
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

fix_matrix('apps/web/src/components/planner/PlannerMatrix.tsx')
