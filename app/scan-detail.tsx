import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { RoomPlanFloorView } from "../components/RoomPlanFloorView";
import { getScans, type SavedScan } from "../utils/scanStorage";
import { previewUSDZ } from "../utils/usdzViewer";
import {
  loadRoomPlanJSON,
  convertTo2DFloorplan,
  scaleFloorplanToFit,
} from "../utils/roomPlanParser";
import { exportFloorplanAsSVG } from "../utils/svgExport";

type ViewMode = "2d" | "3d";

export default function ScanDetailScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const [scan, setScan] = useState<SavedScan | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScan();
  }, [scanId]);

  const loadScan = async () => {
    try {
      setLoading(true);
      const scans = await getScans();
      const foundScan = scans.find((s) => s.id === scanId);
      if (foundScan) {
        setScan(foundScan);
      } else {
        Alert.alert("Error", "Scan not found");
        router.back();
      }
    } catch (error) {
      console.error("Failed to load scan:", error);
      Alert.alert("Error", "Failed to load scan");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleView3D = async () => {
    if (!scan?.roomPlan?.usdzUrl) {
      Alert.alert("Error", "No 3D model available");
      return;
    }

    try {
      await previewUSDZ(scan.roomPlan.usdzUrl);
    } catch (err) {
      console.error("Failed to preview USDZ:", err);
      Alert.alert("Error", "Failed to open 3D preview");
    }
  };

  const handleEditLayout = () => {
    if (scanId) {
      router.push({
        pathname: "/layout",
        params: { scanId },
      });
    }
  };

  const handleExportSVG = async () => {
    if (!scan?.roomPlan?.jsonUrl) {
      Alert.alert("Error", "No floorplan data available to export");
      return;
    }

    try {
      const roomData = await loadRoomPlanJSON(scan.roomPlan.jsonUrl);
      if (!roomData) {
        Alert.alert("Error", "Failed to load floorplan data");
        return;
      }

      const floorplan2D = convertTo2DFloorplan(roomData);
      const scaledFloorplan = scaleFloorplanToFit(floorplan2D, 800, 600, 40);

      const timestamp = new Date(scan.timestamp).toISOString().split("T")[0];
      const filename = `floorplan-${timestamp}.svg`;

      await exportFloorplanAsSVG(scaledFloorplan, filename, {
        showGrid: true,
        showDimensions: true,
        showLabels: true,
        title: `Floor Plan - ${formatDate(scan.timestamp)}`,
      });
    } catch (error) {
      console.error("Failed to export SVG:", error);
      Alert.alert("Export Failed", "Failed to export floor plan");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading scan...</Text>
      </View>
    );
  }

  if (!scan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Scan not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const hasFloorplan = !!scan.roomPlan?.jsonUrl;
  const has3DModel = !!scan.roomPlan?.usdzUrl;

  return (
    <LinearGradient colors={["#0a0a0a", "#1a1a2e"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Scan Details</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{formatDate(scan.timestamp)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Mode</Text>
          <Text style={styles.infoValue}>
            {scan.scanMode === "lidar" ? "LiDAR" : "Photo"}
          </Text>
        </View>
        {scan.pointCount > 0 && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Points</Text>
            <Text style={styles.infoValue}>{scan.pointCount.toLocaleString()}</Text>
          </View>
        )}
      </View>

      {/* View Mode Selector */}
      {hasFloorplan && (
        <View style={styles.viewModeSelector}>
          <Pressable
            style={[
              styles.viewModeButton,
              viewMode === "2d" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("2d")}
          >
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === "2d" && styles.viewModeButtonTextActive,
              ]}
            >
              2D Floorplan
            </Text>
          </Pressable>
          {has3DModel && (
            <Pressable
              style={[
                styles.viewModeButton,
                viewMode === "3d" && styles.viewModeButtonActive,
              ]}
              onPress={handleView3D}
            >
              <Text
                style={[
                  styles.viewModeButtonText,
                  viewMode === "3d" && styles.viewModeButtonTextActive,
                ]}
              >
                3D Model
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {hasFloorplan && viewMode === "2d" ? (
          <View style={styles.floorplanContainer}>
            <RoomPlanFloorView
              jsonUrl={scan.roomPlan!.jsonUrl!}
              showGrid={true}
              showDimensions={true}
              showLabels={true}
            />
          </View>
        ) : !hasFloorplan ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No floorplan data available for this scan
            </Text>
            {has3DModel && (
              <Pressable style={styles.view3DButton} onPress={handleView3D}>
                <Text style={styles.view3DButtonText}>View 3D Model</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {hasFloorplan && (
          <>
            <Pressable style={styles.actionButton} onPress={handleEditLayout}>
              <LinearGradient
                colors={["#007AFF", "#0051D5"]}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Edit Layout</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleExportSVG}>
              <LinearGradient
                colors={["#FF9500", "#FF6B00"]}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Export SVG</Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
        {has3DModel && (
          <Pressable style={styles.actionButton} onPress={handleView3D}>
            <LinearGradient
              colors={["#34C759", "#28A745"]}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>View in AR</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#f44336",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  infoItem: {
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  viewModeSelector: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: "#007AFF",
  },
  viewModeButtonText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  viewModeButtonTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  floorplanContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 400,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },
  view3DButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  view3DButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 30,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
