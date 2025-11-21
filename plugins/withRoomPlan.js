const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRoomPlan = (config) => {
  return withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const iosProjectPath = path.join(projectRoot, 'ios', config.modResults.productName);

    // Ensure the iOS project directory exists
    if (!fs.existsSync(iosProjectPath)) {
      fs.mkdirSync(iosProjectPath, { recursive: true });
    }

    // Copy Swift files
    const swiftSource = path.join(projectRoot, 'native-modules', 'roomplan', 'RoomplanViewManager.swift');
    const swiftDest = path.join(iosProjectPath, 'RoomplanViewManager.swift');

    if (fs.existsSync(swiftSource)) {
      fs.copyFileSync(swiftSource, swiftDest);
    }

    // Copy Objective-C bridge
    const objcSource = path.join(projectRoot, 'native-modules', 'roomplan', 'RoomplanViewManager.m');
    const objcDest = path.join(iosProjectPath, 'RoomplanViewManager.m');

    if (fs.existsSync(objcSource)) {
      fs.copyFileSync(objcSource, objcDest);
    }

    // Add files to Xcode project
    const xcodeProject = config.modResults;
    const groupName = config.modResults.productName;

    // Add Swift file
    if (!xcodeProject.hasFile('RoomplanViewManager.swift')) {
      xcodeProject.addSourceFile(
        'RoomplanViewManager.swift',
        { target: xcodeProject.getFirstTarget().uuid },
        groupName
      );
    }

    // Add Objective-C file
    if (!xcodeProject.hasFile('RoomplanViewManager.m')) {
      xcodeProject.addSourceFile(
        'RoomplanViewManager.m',
        { target: xcodeProject.getFirstTarget().uuid },
        groupName
      );
    }

    return config;
  });
};

module.exports = withRoomPlan;
