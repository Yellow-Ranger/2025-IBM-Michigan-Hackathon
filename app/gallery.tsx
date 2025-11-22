import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  getAllScans,
  deleteScan,
  deleteAllScans,
  formatScanDate,
  SavedScan,
  getStorageStats,
} from "@/utils/scanStorage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { previewUSDZ } from "@/modules/usdz-viewer/src";

function formatTotalPoints(totalPoints: number): string {
  if (totalPoints >= 1_000_000) {
    return `${(totalPoints / 1_000_000).toFixed(1)}M`;
  }
  if (totalPoints >= 1_000) {
    return `${(totalPoints / 1_000).toFixed(1)}K`;
  }
  return totalPoints.toString();
}

function getValidThumbnailUri(thumbnail?: string | null): string | undefined {
  if (!thumbnail) return undefined;

  try {
    const parsed = JSON.parse(thumbnail);
    if (parsed && typeof parsed === "object") {
      const path = (parsed as any).imagePaths?.[0];
      if (typeof path === "string") {
        return path.startsWith("file://") ? path : `file://${path}`;
      }
    }
  } catch {
    // Not JSON, fall through
  }

  const trimmed = thumbnail.trim();
  if (
    trimmed.startsWith("file://") ||
    trimmed.startsWith("content://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http")
  ) {
    return trimmed;
  }

  return undefined;
}

export default function Gallery() {
  const router = useRouter();
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalPoints: 0,
    oldestScan: null as number | null,
    newestScan: null as number | null,
  });

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const [loadedScans, storageStats] = await Promise.all([
        getAllScans(),
        getStorageStats(),
      ]);
      setScans(loadedScans);
      setStats(storageStats);
    } catch (error) {
      console.error("Error loading scans:", error);
      Alert.alert("Error", "Failed to load scans");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const handleDeleteScan = (scanId: string, scanDate: string) => {
    Alert.alert(
      "Delete Scan",
      `Are you sure you want to delete the scan from ${scanDate}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteScan(scanId);
              await loadScans();
            } catch (error) {
              Alert.alert("Error", "Failed to delete scan");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    if (scans.length === 0) {
      Alert.alert("No Scans", "There are no scans to delete");
      return;
    }

    Alert.alert(
      "Delete All Scans",
      `Are you sure you want to delete all ${scans.length} scans? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllScans();
              await loadScans();
            } catch (error) {
              Alert.alert("Error", "Failed to delete scans");
            }
          },
        },
      ]
    );
  };

  const handleViewScan = async (scan: SavedScan) => {
    // If it's a RoomPlan scan with a USDZ file, open it directly in QuickLook
    if (scan.roomPlan?.usdzUrl) {
      try {
        await previewUSDZ(scan.roomPlan.usdzUrl);
      } catch (err) {
        console.error('Failed to preview USDZ:', err);
        Alert.alert('Error', 'Failed to open 3D preview');
      }
    } else {
      // Otherwise, navigate to the preview screen
      router.push({
        pathname: "/preview",
        params: { scanId: scan.id },
      });
    }
  };

  const handleEditLayout = (scanId: string) => {
    router.push({
      pathname: "/layout",
      params: { scanId },
    });
  };

  const renderScanItem = ({ item }: { item: SavedScan }) => {
    const thumbnailUri = getValidThumbnailUri(item.thumbnail);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.scanCard,
          pressed && styles.scanCardPressed,
        ]}
        onPress={() => handleViewScan(item)}
        onLongPress={() =>
          handleDeleteScan(item.id, formatScanDate(item.timestamp))
        }
      >
        <LinearGradient
          colors={["rgba(0, 212, 255, 0.1)", "rgba(0, 212, 255, 0.05)"]}
          style={styles.scanCardGradient}
        >
          <View style={styles.scanCardHeader}>
            <Text style={styles.scanCardMode}>
              {item.scanMode === "lidar"
                ? item.roomPlan
                  ? "📐 RoomPlan"
                  : "📡 LiDAR"
                : "📷 Photo"}
            </Text>
            <Pressable
              style={styles.deleteButton}
              onPress={() =>
                handleDeleteScan(item.id, formatScanDate(item.timestamp))
              }
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>

          <View style={styles.scanCardBody}>
            {thumbnailUri && (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}
            <Text style={styles.scanCardDate}>
              {formatScanDate(item.timestamp)}
            </Text>
            <Text style={styles.scanCardPoints}>
              {item.pointCount.toLocaleString()} points
            </Text>
          </View>

          <View style={styles.scanCardFooter}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleViewScan(item)}
            >
              <MaterialCommunityIcons name="eye" size={16} color="#00d4ff" />
              <Text style={styles.actionText}>
                {item.roomPlan ? 'View 3D' : 'View Details'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => handleEditLayout(item.id)}
            >
              <MaterialCommunityIcons name="floor-plan" size={16} color="#0b0f24" />
              <Text style={styles.actionTextPrimary}>Edit Layout</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptyText}>
        Start scanning to see your 3D room captures here
      </Text>
      <Pressable
        style={styles.startScanButton}
        onPress={() => router.push("/scan-webview")}
      >
        <Text style={styles.startScanButtonText}>Start Scanning</Text>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Scan Gallery</Text>
        {scans.length > 0 && (
          <Pressable style={styles.deleteAllButton} onPress={handleDeleteAll}>
            <Text style={styles.deleteAllButtonText}>Delete All</Text>
          </Pressable>
        )}
      </View>

      {scans.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatTotalPoints(stats.totalPoints)}
            </Text>
            <Text style={styles.statLabel}>Total 3D Points</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.layoutCardContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.layoutCard,
            pressed && styles.layoutCardPressed,
          ]}
          onPress={() => router.push("/layout")}
        >
          <View style={styles.layoutCardText}>
            <Text style={styles.layoutTitle}>Layout Studio</Text>
            <Text style={styles.layoutBody}>
              2D/3D editor + natural language commands powered by Watsonx
            </Text>
          </View>
          <MaterialCommunityIcons name="factory" size={40} color="#0b0f24" />
        </Pressable>
      </View>
      <LinearGradient
        colors={["#000000", "#001a1a", "#000000"]}
        style={styles.gradient}
      >
        <FlatList
          data={scans}
          renderItem={renderScanItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00d4ff"
              colors={["#00d4ff"]}
            />
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  gradient: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
  },
  layoutCardContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  layoutCard: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#cde3ff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: "rgba(15, 88, 193, 0.2)",
    gap: 12,
  },
  layoutCardPressed: {
    opacity: 0.9,
    transform: [{ translateY: 2 }],
  },
  layoutCardText: {
    flex: 1,
    gap: 6,
  },
  layoutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0b0f24",
  },
  layoutBody: {
    fontSize: 14,
    color: "#0b0f24",
    lineHeight: 20,
  },
  deleteAllButton: {
    backgroundColor: "rgba(255, 0, 110, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 110, 0.3)",
  },
  deleteAllButtonText: {
    color: "#ff006e",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.2)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00d4ff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#a0a0a0",
  },
  scanCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  scanCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  scanCardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.2)",
    borderRadius: 16,
  },
  scanCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scanCardMode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00d4ff",
  },
  deleteButton: {
    backgroundColor: "rgba(255, 0, 110, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 110, 0.3)",
  },
  deleteButtonText: {
    color: "#ff006e",
    fontSize: 12,
    fontWeight: "600",
  },
  scanCardBody: {
    marginBottom: 12,
  },
  thumbnail: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginBottom: 8,
  },
  scanCardDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  scanCardPoints: {
    fontSize: 14,
    color: "#a0a0a0",
  },
  scanCardFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.3)",
  },
  actionButtonPrimary: {
    backgroundColor: "#00d4ff",
    borderColor: "#00d4ff",
  },
  actionText: {
    fontSize: 13,
    color: "#00d4ff",
    fontWeight: "600",
  },
  actionTextPrimary: {
    fontSize: 13,
    color: "#0b0f24",
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#a0a0a0",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  startScanButton: {
    backgroundColor: "#00d4ff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startScanButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
