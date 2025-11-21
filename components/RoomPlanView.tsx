import React, { useRef, useCallback } from 'react';
import {
  Platform,
  UIManager,
  findNodeHandle,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';

const LINKING_ERROR = `The RoomPlanView component doesn't seem to be linked. Make sure:
${Platform.select({ ios: "- You have run 'pod install'\n", default: '' })}- You rebuilt the app after installing the package
- You are not using Expo Go`;

export type RoomplanProps = ViewProps & {
  color?: string;
  onExportComplete?: (event: {
    nativeEvent: { json: string; usdzBase64: string };
  }) => void;
  onScanFinished?: (event: { nativeEvent: { roomJson: string } }) => void;
};

const ComponentName = 'RoomplanView';

const NativeRoomPlanView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<RoomplanProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };

export interface RoomPlanViewHandle {
  startScanning: () => void;
  stopScanning: () => void;
  exportScanResults: () => void;
}

export const RoomPlanView = React.forwardRef<
  RoomPlanViewHandle,
  RoomplanProps
>((props, ref) => {
  const nativeRef = useRef(null);

  const startScanning = useCallback(() => {
    const node = findNodeHandle(nativeRef.current);
    if (node) {
      UIManager.dispatchViewManagerCommand(node, 'startScanning', []);
    }
  }, []);

  const stopScanning = useCallback(() => {
    const node = findNodeHandle(nativeRef.current);
    if (node) {
      UIManager.dispatchViewManagerCommand(node, 'stopScanning', []);
    }
  }, []);

  const exportScanResults = useCallback(() => {
    const node = findNodeHandle(nativeRef.current);
    if (node) {
      UIManager.dispatchViewManagerCommand(node, 'exportScanResults', []);
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    startScanning,
    stopScanning,
    exportScanResults,
  }));

  return <NativeRoomPlanView ref={nativeRef} {...props} />;
});

RoomPlanView.displayName = 'RoomPlanView';

export default RoomPlanView;
