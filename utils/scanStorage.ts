import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RoomPlanExport {
  usdzUrl?: string;
  jsonUrl?: string;
  exportType?: 'parametric' | 'mesh' | 'model';
}

export interface SavedScan {
  id: string;
  timestamp: number;
  scanMode: 'lidar' | 'photo';
  pointCount: number;
  data: {
    points: Array<{ x: number; y: number; z: number }>;
    colors?: Array<{ r: number; g: number; b: number }>;
  };
  // Optional linkage back to backend photogrammetry results
  backendScanId?: string;
  stlUrl?: string;
  thumbnail?: string; // local file URI or base64 thumbnail
  roomPlan?: RoomPlanExport;
}

const SCANS_STORAGE_KEY = '@lidar_scans';

/**
 * Save a new scan to storage
 */
export async function saveScan(scan: Omit<SavedScan, 'id' | 'timestamp'>): Promise<SavedScan> {
  try {
    const newScan: SavedScan = {
      ...scan,
      id: generateScanId(),
      timestamp: Date.now(),
    };

    const existingScans = await getAllScans();
    const updatedScans = [newScan, ...existingScans];

    await AsyncStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(updatedScans));
    return newScan;
  } catch (error) {
    console.error('Error saving scan:', error);
    throw error;
  }
}

/**
 * Get all saved scans, sorted by timestamp (newest first)
 */
export async function getAllScans(): Promise<SavedScan[]> {
  try {
    const scansJson = await AsyncStorage.getItem(SCANS_STORAGE_KEY);
    if (!scansJson) {
      return [];
    }

    const scans: SavedScan[] = JSON.parse(scansJson);
    return scans.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error retrieving scans:', error);
    return [];
  }
}

/**
 * Alias for getAllScans (for compatibility)
 */
export const getScans = getAllScans;

/**
 * Get a single scan by ID
 */
export async function getScanById(id: string): Promise<SavedScan | null> {
  try {
    const scans = await getAllScans();
    return scans.find(scan => scan.id === id) || null;
  } catch (error) {
    console.error('Error retrieving scan:', error);
    return null;
  }
}

/**
 * Delete a scan by ID
 */
export async function deleteScan(id: string): Promise<void> {
  try {
    const scans = await getAllScans();
    const updatedScans = scans.filter(scan => scan.id !== id);
    await AsyncStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(updatedScans));
  } catch (error) {
    console.error('Error deleting scan:', error);
    throw error;
  }
}

/**
 * Delete all scans
 */
export async function deleteAllScans(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SCANS_STORAGE_KEY);
  } catch (error) {
    console.error('Error deleting all scans:', error);
    throw error;
  }
}

/**
 * Generate a unique scan ID
 */
function generateScanId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format timestamp for display
 */
export function formatScanDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalScans: number;
  totalPoints: number;
  oldestScan: number | null;
  newestScan: number | null;
}> {
  try {
    const scans = await getAllScans();

    return {
      totalScans: scans.length,
      totalPoints: scans.reduce((sum, scan) => sum + scan.pointCount, 0),
      oldestScan: scans.length > 0 ? scans[scans.length - 1].timestamp : null,
      newestScan: scans.length > 0 ? scans[0].timestamp : null,
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalScans: 0,
      totalPoints: 0,
      oldestScan: null,
      newestScan: null,
    };
  }
}
