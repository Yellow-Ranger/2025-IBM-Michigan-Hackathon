import { NativeModules, Platform } from 'react-native';

const { USDZViewerModule } = NativeModules;

export async function previewUSDZ(fileUrl: string): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    throw new Error('USDZ preview is only supported on iOS');
  }

  if (!USDZViewerModule) {
    throw new Error('USDZViewerModule is not available. Make sure the native module is properly linked.');
  }

  return await USDZViewerModule.previewUSDZ(fileUrl);
}
