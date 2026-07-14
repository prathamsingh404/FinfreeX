import subprocess
import os
import time

status = subprocess.check_output("git status -s", shell=True, text=True)
lines = [line for line in status.split('\n') if line]

count = 0
for line in lines:
    if len(line) < 4: continue
    action = line[:2]
    filename = line[3:].strip()
    
    if "Left Text Removed" in filename or ".zcode" in filename or "SME-" in filename or "ui-ux-" in filename or "commit_script.py" in filename:
        continue
        
    if filename.endswith('/'): continue
    
    if filename.startswith('"') and filename.endswith('"'):
        filename = filename[1:-1]
        
    print(f"Committing {filename}")
    subprocess.run(f'git add "{filename}"', shell=True)
    
    msg = f"Update {os.path.basename(filename)}"
    if action == '??':
        msg = f"Add {os.path.basename(filename)}"
        
    subprocess.run(f'git commit -m "{msg}"', shell=True)
    count += 1

print(f"Created {count} commits.")
subprocess.run("git push origin HEAD", shell=True)
