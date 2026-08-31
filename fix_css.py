import codecs

def fix_css(filepath):
    with codecs.open(filepath, 'r', 'utf-8') as f:
        content = f.read()

    # Add @custom-variant dark
    if '@custom-variant dark' not in content:
        content = content.replace('@import "tailwindcss";', '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));')
    
    with codecs.open(filepath, 'w', 'utf-8') as f:
        f.write(content)

fix_css('apps/web/src/index.css')
