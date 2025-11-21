# RoomPlan Native Module

This directory contains the source files for the custom RoomPlan native module.

## Files

- `RoomplanViewManager.swift` - Swift implementation of the RoomPlan view manager
- `RoomplanViewManager.m` - Objective-C bridge for React Native

## Important

**DO NOT DELETE THESE FILES!**

These files are the source of truth for the RoomPlan native module. During `npx expo prebuild`, the config plugin (`plugins/withRoomPlan.js`) automatically copies these files to the iOS project and adds them to the Xcode project.

## How It Works

1. Source files stored here are version controlled
2. When you run `npx expo prebuild`, the plugin copies them to `ios/ProjectLyoko/`
3. The plugin also registers them with the Xcode project

## Modifying

If you need to modify the RoomPlan implementation:

1. Edit the files in this directory (`native-modules/roomplan/`)
2. Run `npx expo prebuild --clean` to regenerate the iOS project
3. Or manually copy the updated files to `ios/ProjectLyoko/`
