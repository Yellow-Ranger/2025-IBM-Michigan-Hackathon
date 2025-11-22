import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, Text, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getScanById, SavedScan, formatScanDate } from '@/utils/scanStorage';
import { previewUSDZ } from '@/utils/usdzViewer';

function getValidThumbnailUri(thumbnail?: string | null): string | undefined {
  if (!thumbnail) return undefined;

  try {
    const parsed = JSON.parse(thumbnail);
    if (parsed && typeof parsed === 'object') {
      const path = (parsed as any).imagePaths?.[0];
      if (typeof path === 'string') {
        return path.startsWith('file://') ? path : `file://${path}`;
      }
    }
  } catch {
    // Not JSON, ignore
  }

  const trimmed = thumbnail.trim();
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http')
  ) {
    return trimmed;
  }

  return undefined;
}

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scanId?: string }>();
  const [scan, setScan] = useState<SavedScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scanId = params.scanId as string | undefined;

  useEffect(() => {
    const loadScan = async () => {
      try {
        if (!scanId) {
          setError('Missing scan ID');
          setLoading(false);
          return;
        }

        const savedScan = await getScanById(scanId);

        if (!savedScan) {
          setError('Scan not found');
          setLoading(false);
          return;
        }

        // Check if it's a RoomPlan scan or a regular photo scan
        if (!savedScan.roomPlan && !savedScan.backendScanId) {
          setError('This scan does not have a 3D model available.');
          setLoading(false);
          return;
        }

        setScan(savedScan);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load scan for preview:', err);
        setError('Failed to load scan');
        setLoading(false);
      }
    };

    loadScan();
  }, [scanId]);

  useEffect(() => {
    if (error) {
      Alert.alert('Preview Error', error, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    }
  }, [error]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Loading scan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!scan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Unable to load scan preview.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const thumbnailUri = scan ? getValidThumbnailUri(scan.thumbnail) : undefined;

  const handleView3D = async () => {
    if (!scan.roomPlan?.usdzUrl) {
      Alert.alert('Error', 'No 3D model available for this scan');
      return;
    }

    try {
      await previewUSDZ(scan.roomPlan.usdzUrl);
    } catch (err) {
      console.error('Failed to preview USDZ:', err);
      Alert.alert('Error', 'Failed to open 3D preview');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Preview</Text>
          <Text style={styles.subtitle}>{formatScanDate(scan.timestamp)}</Text>
        </View>

        {thumbnailUri && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnail}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scan Mode</Text>
            <Text style={styles.infoValue}>{scan.scanMode.toUpperCase()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Point Count</Text>
            <Text style={styles.infoValue}>{scan.pointCount.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scan ID</Text>
            <Text style={styles.infoValueSmall}>{scan.id}</Text>
          </View>

          {scan.backendScanId && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Backend ID</Text>
                <Text style={styles.infoValueSmall}>{scan.backendScanId}</Text>
              </View>
            </>
          )}

          {scan.stlUrl && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>3D Model</Text>
                <Text style={styles.infoValueSmall}>Available</Text>
              </View>
            </>
          )}

          {scan.roomPlan && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>RoomPlan</Text>
                <Text style={styles.infoValueSmall}>
                  {scan.roomPlan.usdzUrl ? 'USDZ ready' : 'Processing'}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Point Cloud Data</Text>
          <Text style={styles.statsText}>
            This scan contains {scan.data.points.length.toLocaleString()} points
            {scan.data.colors ? ' with color information' : ''}.
          </Text>
        </View>

        {scan.roomPlan?.usdzUrl && (
          <Pressable style={styles.view3DButton} onPress={handleView3D}>
            <Text style={styles.view3DButtonText}>View 3D Model</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  thumbnailContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00d4ff',
  },
  infoValueSmall: {
    fontSize: 12,
    color: '#00d4ff',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 4,
  },
  statsCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  view3DButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  view3DButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
