import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Layout3DPreview } from "@/components/Layout3DPreview";
import { FloorPlanEditor } from "@/components/FloorPlanEditor";
import { WatsonxCommandInput } from "@/components/WatsonxCommandInput";
import {
  LayoutItem,
  applyLayoutActions,
  buildHeuristicPlan,
  buildSampleLayout,
  DEFAULT_LAYOUT_BOUNDS,
  LayoutAction,
} from "@/utils/layoutPlanner";
import { planWithFallback } from "@/utils/watsonxClient";
import { getScanById } from "@/utils/scanStorage";

const PRIMARY = "#0f58c1";

export default function LayoutScreen() {
  const params = useLocalSearchParams();
  const scanId = params.scanId as string | undefined;

  const [items, setItems] = useState<LayoutItem[]>(() => buildSampleLayout());
  const [loadingScan, setLoadingScan] = useState(!!scanId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [status, setStatus] = useState("Waiting for a command");
  const [summary, setSummary] = useState("No changes yet.");
  const [loading, setLoading] = useState(false);
  const [scanInfo, setScanInfo] = useState<string | null>(null);

  useEffect(() => {
    if (scanId) {
      loadScanData(scanId);
    }
  }, [scanId]);

  const loadScanData = async (id: string) => {
    try {
      setLoadingScan(true);
      const scan = await getScanById(id);
      if (scan) {
        setScanInfo(`Loaded from ${scan.scanMode === "lidar" ? "LiDAR" : "Photo"} scan with ${scan.pointCount} points`);
        setStatus("Loaded scan data - ready for commands");
        setSummary(`Floor plan initialized from ${scan.scanMode === "lidar" ? "LiDAR" : "photo"} scan captured on ${new Date(scan.timestamp).toLocaleDateString()}`);
      }
    } catch (error) {
      console.error("Failed to load scan:", error);
      Alert.alert("Error", "Failed to load scan data. Using sample layout.");
    } finally {
      setLoadingScan(false);
    }
  };

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId]
  );

  const applyActions = (actions: LayoutAction[]) => {
    setItems((prev) => applyLayoutActions(prev, actions, DEFAULT_LAYOUT_BOUNDS));
  };

  const handleCommand = async (prompt: string) => {
    try {
      setLoading(true);
      setStatus("Sending to Watsonx...");
      const plan = await planWithFallback(prompt, items);
      applyActions(plan.actions);
      setSummary(plan.summary);
      setStatus(
        plan.source === "watsonx"
          ? "Watsonx applied the plan"
          : "Heuristic applied (Watsonx unavailable)"
      );
    } catch (error) {
      console.error("Watsonx command failed", error);
      const fallback = buildHeuristicPlan(prompt, items);
      applyActions(fallback.actions);
      setSummary(fallback.summary);
      setStatus("Heuristic applied (Watsonx unavailable)");
      Alert.alert(
        "Watsonx unavailable",
        "We applied a local heuristic so you can keep moving."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = (dx: number, dy: number) => {
    if (!selectedItem) return;
    applyActions([{ kind: "move", id: selectedItem.id, dx, dy }]);
  };

  const handleRotate = () => {
    if (!selectedItem) return;
    applyActions([
      {
        kind: "rotate",
        id: selectedItem.id,
        rotation: ((selectedItem.rotation ?? 0) + 90) % 360,
      },
    ]);
  };

  const handleReset = () => {
    setItems(buildSampleLayout());
    setSummary("Reset to sample layout");
    setStatus("Waiting for a command");
  };

  if (loadingScan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading scan data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Layout Studio</Text>
            <Text style={styles.subtitle}>
              {scanInfo || "Natural-language floor edits powered by Watsonx"}
            </Text>
          </View>
          <View style={styles.modeSwitch}>
            <Pressable
              style={[
                styles.modeButton,
                mode === "2d" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("2d")}
            >
              <Text
                style={[
                  styles.modeLabel,
                  mode === "2d" && styles.modeLabelActive,
                ]}
              >
                2D
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                mode === "3d" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("3d")}
            >
              <Text
                style={[
                  styles.modeLabel,
                  mode === "3d" && styles.modeLabelActive,
                ]}
              >
                3D
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.canvasCard}>
          <View style={styles.canvasHeader}>
            <Text style={styles.canvasTitle}>
              {mode === "2d" ? "2D Layout" : "3D Preview"}
            </Text>
            <Text style={styles.canvasCaption}>{status}</Text>
          </View>
          {mode === "2d" ? (
            <FloorPlanEditor
              items={items}
              bounds={DEFAULT_LAYOUT_BOUNDS}
              selectedId={selectedItem?.id}
              onSelect={setSelectedId}
            />
          ) : (
            <Layout3DPreview
              items={items}
              bounds={DEFAULT_LAYOUT_BOUNDS}
              selectedId={selectedItem?.id}
            />
          )}
        </View>

        <View style={styles.chipRow}>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => handleNudge(-2, 0)}
          >
            <Text style={styles.chipText}>◀ Nudge</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => handleNudge(2, 0)}
          >
            <Text style={styles.chipText}>Nudge ▶</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => handleNudge(0, -2)}
          >
            <Text style={styles.chipText}>▲ Raise</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
            onPress={() => handleNudge(0, 2)}
          >
            <Text style={styles.chipText}>Lower ▼</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.chipAccent,
              pressed && styles.chipPressed,
            ]}
            onPress={handleRotate}
          >
            <Text style={styles.chipAccentText}>↻ Rotate 90°</Text>
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Latest Insight</Text>
          <Text style={styles.statusText}>{summary}</Text>
          {selectedItem ? (
            <Text style={styles.statusDetail}>
              Focus: {selectedItem.name} — {selectedItem.width}x
              {selectedItem.height} ft @ ({selectedItem.x.toFixed(1)},{" "}
              {selectedItem.y.toFixed(1)})
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.resetButtonPressed,
            ]}
            onPress={handleReset}
          >
            <Text style={styles.resetText}>Reset to sample layout</Text>
          </Pressable>
        </View>

        <WatsonxCommandInput
          onSubmit={handleCommand}
          loading={loading}
          status={status}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f24",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    color: "#f6fbff",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: "#c1ccdc",
    marginTop: 4,
  },
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: PRIMARY,
  },
  modeLabel: {
    color: "#c1ccdc",
    fontWeight: "700",
    fontSize: 14,
  },
  modeLabelActive: {
    color: "#0b0f24",
  },
  canvasCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  canvasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  canvasTitle: {
    color: "#f6fbff",
    fontWeight: "700",
    fontSize: 16,
  },
  canvasCaption: {
    color: "#a7b7c6",
    fontSize: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipAccent: {
    backgroundColor: "#00d4ff",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    color: "#dbe6f5",
    fontWeight: "600",
  },
  chipAccentText: {
    color: "#0b0f24",
    fontWeight: "700",
  },
  statusCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statusTitle: {
    color: "#f6fbff",
    fontWeight: "700",
    fontSize: 16,
  },
  statusText: {
    color: "#c8d5e8",
    fontSize: 14,
    lineHeight: 20,
  },
  statusDetail: {
    color: "#9fb3c8",
    fontSize: 12,
  },
  resetButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  resetButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  resetText: {
    color: "#e9f0ff",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#c1ccdc",
    fontWeight: "600",
  },
});
