import { useState, useCallback } from 'react';
import { PointCloudData } from '@/utils/stlGenerator';

/**
 * Custom hook to manage scan data state
 */
export function useScanData() {
  const [scanData, setScanData] = useState<PointCloudData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const startScan = useCallback(() => {
    setIsScanning(true);
    setScanProgress(0);
    setScanData(null);
  }, []);

  const updateProgress = useCallback((progress: number) => {
    setScanProgress(progress);
  }, []);

  const completeScan = useCallback((data: PointCloudData) => {
    setScanData(data);
    setIsScanning(false);
    setScanProgress(100);
  }, []);

  const resetScan = useCallback(() => {
    setScanData(null);
    setIsScanning(false);
    setScanProgress(0);
  }, []);

  return {
    scanData,
    isScanning,
    scanProgress,
    startScan,
    updateProgress,
    completeScan,
    resetScan,
  };
}
