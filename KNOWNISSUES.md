# Known Issues

## 1. FortuneSheet setSelection Frozen Object Error

**Problem:**
Calling `workbook.setSelection()` causes error: "Cannot assign to read only property 'row'"

**Root Cause:**
FortuneSheet's internal `normalizeSelection` function tries to mutate frozen/immutable objects

**Impact:**
Cannot highlight cells visually when AI updates them (UX enhancement only - core functionality works)

**Current Solution:**
Removed all `setSelection` calls from spreadsheet tools

**Future Investigation:**
1. Check if FortuneSheet has alternative API for selection
2. Try FortuneSheet version upgrade
3. Consider patching normalizeSelection to avoid mutation

**Related Commits:**
Added in d9eef1d, removed in current changes
