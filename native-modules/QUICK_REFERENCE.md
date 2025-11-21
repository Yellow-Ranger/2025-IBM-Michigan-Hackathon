# Native Modules Quick Reference

## Directory Structure

```
native-modules/
└── roomplan/                    ← Custom RoomPlan integration
    ├── README.md
    ├── RoomplanViewManager.swift
    └── RoomplanViewManager.m
```

## Key Points

### ✅ DO
- Edit files in `native-modules/roomplan/` when making changes
- Commit these files to git
- Use the config plugin for automatic deployment

### ❌ DON'T
- Edit files directly in `ios/ProjectLyoko/` (they'll be overwritten)
- Delete the `native-modules/` directory
- Remove the plugin from `app.json`

## Quick Commands

```bash
# Rebuild iOS with native modules
npx expo prebuild --clean --platform ios
cd ios && pod install

# Manual copy during development (faster than full rebuild)
cp native-modules/roomplan/*.{swift,m} ios/ProjectLyoko/

# Verify files are in place
ls -la ios/ProjectLyoko/Roomplan*
```

## How It Works

1. **Source**: `native-modules/roomplan/` (git tracked)
2. **Plugin**: `plugins/withRoomPlan.js` (copies during prebuild)
3. **Target**: `ios/ProjectLyoko/` (git ignored, regenerated)
4. **Config**: `app.json` (references plugin)

## Status Check

```bash
# Are source files present?
ls native-modules/roomplan/

# Is plugin configured?
grep "withRoomPlan" app.json

# Were files deployed?
ls ios/ProjectLyoko/Roomplan*
```
