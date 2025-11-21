const { withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRoomPlan = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;

      // Get the iOS project name from the config
      const projectName = config.modRequest.projectName || 'ProjectLyoko';
      const iosProjectPath = path.join(platformProjectRoot, projectName);

      // Ensure the iOS project directory exists
      if (!fs.existsSync(iosProjectPath)) {
        console.warn(`⚠️  iOS project directory not found: ${iosProjectPath}`);
        return config;
      }

      // Copy Swift file
      const swiftSource = path.join(projectRoot, 'native-modules', 'roomplan', 'RoomplanViewManager.swift');
      const swiftDest = path.join(iosProjectPath, 'RoomplanViewManager.swift');

      if (fs.existsSync(swiftSource)) {
        fs.copyFileSync(swiftSource, swiftDest);
        console.log('✅ Copied RoomplanViewManager.swift');
      } else {
        console.warn(`⚠️  Source file not found: ${swiftSource}`);
      }

      // Copy Objective-C bridge
      const objcSource = path.join(projectRoot, 'native-modules', 'roomplan', 'RoomplanViewManager.m');
      const objcDest = path.join(iosProjectPath, 'RoomplanViewManager.m');

      if (fs.existsSync(objcSource)) {
        fs.copyFileSync(objcSource, objcDest);
        console.log('✅ Copied RoomplanViewManager.m');
      } else {
        console.warn(`⚠️  Source file not found: ${objcSource}`);
      }

      // Update bridging header to include React imports
      const bridgingHeaderPath = path.join(iosProjectPath, `${projectName}-Bridging-Header.h`);
      if (fs.existsSync(bridgingHeaderPath)) {
        let bridgingHeader = fs.readFileSync(bridgingHeaderPath, 'utf8');

        // Check if React imports are already present
        if (!bridgingHeader.includes('#import <React/RCTBridgeModule.h>')) {
          // Add React imports after the header comment
          const reactImports = `#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
`;
          bridgingHeader = bridgingHeader.replace(
            /\/\/\n$/m,
            `//\n${reactImports}`
          );
          fs.writeFileSync(bridgingHeaderPath, bridgingHeader);
          console.log('✅ Updated bridging header with React imports');
        }
      }

      return config;
    },
  ]);
};

module.exports = withRoomPlan;
