import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Check if the current device has LiDAR capability
 * LiDAR is available on:
 * - iPhone 12 Pro and later Pro/Pro Max models
 * - iPad Pro 11-inch (2nd gen and later)
 * - iPad Pro 12.9-inch (4th gen and later)
 */
export async function hasLiDAR(): Promise<boolean> {
  // LiDAR is only available on iOS devices
  if (Device.osName !== 'iOS' && Device.osName !== 'iPadOS') {
    return false;
  }

  const deviceModel = Device.modelName || '';
  const deviceYear = String(Constants.systemVersion || '');

  // Check for known LiDAR-capable devices
  const lidarModels = [
    'iPhone 12 Pro',
    'iPhone 13 Pro',
    'iPhone 14 Pro',
    'iPhone 15 Pro',
    'iPhone 16 Pro',
    'iPad Pro',
  ];

  // Check if device model matches LiDAR-capable models
  const hasLiDARModel = lidarModels.some(model => deviceModel.includes(model));

  // For iPad Pro, need to check generation (2020 and later)
  if (deviceModel.includes('iPad Pro')) {
    try {
      const yearMatch = deviceYear.match(/\d{4}/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        return year >= 2020;
      }
    } catch (e) {
      console.warn('Could not parse device year', e);
    }
  }

  return hasLiDARModel;
}

/**
 * Determine if Apple RoomPlan should be available.
 * Requires: iOS, LiDAR device, and iOS 17+ (RoomPlan minimum).
 */
export async function hasRoomPlan(): Promise<boolean> {
  const lidar = await hasLiDAR();
  if (!lidar) return false;

  if (Platform.OS !== 'ios') return false;

  const osVersion = Device.osVersion || Constants.systemVersion || '';
  const major = parseInt(String(osVersion).split('.')[0], 10);

  return !Number.isNaN(major) && major >= 17;
}

/**
 * Get the recommended scanning mode for the device
 */
export async function getRecommendedScanMode(): Promise<'lidar' | 'photo'> {
  const lidarAvailable = await hasLiDAR();
  return lidarAvailable ? 'lidar' : 'photo';
}

/**
 * Get device capabilities for scanning
 */
export async function getDeviceCapabilities() {
  const lidarAvailable = await hasLiDAR();
  const roomPlanAvailable = await hasRoomPlan();

  return {
    hasLiDAR: lidarAvailable,
    hasCamera: true, // All mobile devices have cameras
    recommendedMode: lidarAvailable ? 'lidar' : 'photo',
    deviceModel: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    roomPlanAvailable,
  };
}
