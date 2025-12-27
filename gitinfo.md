# Git Information - Repository Cleanup

This document records how the project repository was cleaned and restored to a specific state.

## 1. Finding the Target State
We first identified the history of changes using `git log` to find the last known good commit before the unwanted "essential files" (like `__pycache__` and merge clutter) were added.

**Command used:**
```bash
git log -n 10 --oneline
```

The target commit was identified as `e2c1e38` ("removing some issential files").

## 2. Restoring the State
To remove all changes, commits, and unwanted files added after that specific point, we used a **hard reset**. This forces the local files and the current branch (HEAD) to match the state of the target commit exactly.

**Command used:**
```bash
git reset --hard e2c1e38
```

> [!WARNING]
> A `git reset --hard` will permanently discard any local work or commits that were made after the target commit. Use it only when you are sure you want to revert completely.

## 3. Alternative Cleanup Tools

### Removing Untracked/Ignored Files from Git
If you have files that are in your `.gitignore` but are still being tracked by Git (like accidentally committed `__pycache__`), you can remove them from tracking without deleting the files locally:

```bash
git rm -r --cached .
git add .
git commit -m "Stop tracking ignored files"
```

### Deleting `__pycache__` Folders (PowerShell)
To physically delete all Python cache folders from your local machine:

```powershell
Get-ChildItem -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force
```

## 4. Current Repository Status
The project is currently synchronized with the state of commit `e2c1e38`.
