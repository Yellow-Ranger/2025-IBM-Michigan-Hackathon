import { NativeModulesProxy } from 'expo-modules-core';

const USDZViewer = NativeModulesProxy.USDZViewer;

export async function previewUSDZ(fileUrl: string): Promise<boolean> {
  if (!USDZViewer) {
    throw new Error('USDZViewer module is not available. This feature is only supported on iOS.');
  }

  return await USDZViewer.previewUSDZ(fileUrl);
}

export default {
  previewUSDZ,
};
