import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('stderr2.log', 'r', encoding='utf-16le', errors='ignore') as f:
    text = f.read()
    with open('cleaned_error.txt', 'w', encoding='utf-8') as out:
        out.write(text)
