# Native Modules Protection Strategy

## Overview

This project contains custom native modules that need protection from Expo's `prebuild` command.

## Protected Modules

### RoomPlan
- **Location**: `native-modules/roomplan/`
- **Files**:
  - `RoomplanViewManager.swift`
  - `RoomplanViewManager.m`
- **Plugin**: `plugins/withRoomPlan.js`

## Protection Mechanism

### 1. Source Control
```
✅ TRACKED (git):
   - native-modules/roomplan/
   - plugins/withRoomPlan.js
   - components/RoomPlanView.tsx

❌ IGNORED (git):
   - ios/
   - android/
```

### 2. Automatic Deployment
The config plugin in `app.json` ensures native modules are automatically restored:

```json
{
  "plugins": [
    "./plugins/withRoomPlan.js"
  ]
}
```

### 3. Build Process
```bash
npx expo prebuild --clean
  ↓
Plugin runs automatically
  ↓
Files copied from native-modules/ to ios/
  ↓
Files added to Xcode project
```

## Team Guidelines

### For Developers

**Before making native changes:**
1. Navigate to `native-modules/roomplan/`
2. Edit the Swift/Objective-C files
3. Test with manual copy: `cp native-modules/roomplan/*.{swift,m} ios/ProjectLyoko/`
4. Commit changes to `native-modules/`

**Never:**
- Don't edit files in `ios/ProjectLyoko/` directly
- Don't remove the config plugin
- Don't delete `native-modules/` directory

### For CI/CD

Ensure build pipeline includes:
```bash
npm install
npx expo prebuild --platform ios
cd ios && pod install
```

The config plugin will automatically restore all native modules.

## Verification Checklist

- [ ] Source files exist in `native-modules/roomplan/`
- [ ] Plugin exists at `plugins/withRoomPlan.js`
- [ ] Plugin is referenced in `app.json`
- [ ] Component exists at `components/RoomPlanView.tsx`
- [ ] `.gitignore` excludes `ios/` directory
- [ ] `.gitignore` DOES NOT exclude `native-modules/`

## Recovery

If native modules are lost:

1. **Check git history:**
   ```bash
   git log --all -- native-modules/roomplan/
   ```

2. **Restore from git:**
   ```bash
   git checkout HEAD -- native-modules/roomplan/
   ```

3. **Rebuild:**
   ```bash
   npx expo prebuild --clean --platform ios
   cd ios && pod install
   ```

## Adding New Native Modules

1. Create source directory: `native-modules/[module-name]/`
2. Add Swift/Objective-C files
3. Create config plugin: `plugins/with[ModuleName].js`
4. Reference in `app.json` plugins array
5. Create React component wrapper
6. Document in this file
