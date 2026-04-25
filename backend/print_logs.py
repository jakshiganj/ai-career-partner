import sys
with open('stdout.log', 'r', encoding='utf-16le', errors='ignore') as f:
    print('--- STDOUT ---')
    print(f.read())
with open('stderr.log', 'r', encoding='utf-16le', errors='ignore') as f:
    print('--- STDERR ---')
    print(f.read())
