import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { FloorPlanEditor } from "@/components/FloorPlanEditor";
import { ImpactDashboard } from "@/components/ImpactDashboard";
import { ConstraintChecker } from "@/components/ConstraintChecker";
import {
  LayoutItem,
  buildSampleLayout,
  applyLayoutActions,
} from "@/utils/layoutPlanner";
import {
  optimizeLayout,
  OptimizationMode,
  OptimizationResult,
  calculateMetrics,
  checkConstraints,
} from "@/utils/layoutOptimizer";

export default function OptimizeScreen() {
  const params = useLocalSearchParams();

  // Initialize with sample layout or from params
  const initialLayout = useMemo(() => buildSampleLayout(), []);
  const [currentLayout, setCurrentLayout] = useState<LayoutItem[]>(initialLayout);
  const [originalLayout] = useState<LayoutItem[]>(initialLayout);
  const [selectedMode, setSelectedMode] = useState<OptimizationMode | null>(null);
  const [optimizationResult, setOptimizationResult] =
    useState<OptimizationResult | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const currentMetrics = useMemo(
    () => calculateMetrics(currentLayout, { width: 120, height: 72 }),
    [currentLayout]
  );

  const originalMetrics = useMemo(
    () => calculateMetrics(originalLayout, { width: 120, height: 72 }),
    [originalLayout]
  );

  const currentViolations = useMemo(
    () => checkConstraints(currentLayout, { width: 120, height: 72 }),
    [currentLayout]
  );

  const handleOptimize = (mode: OptimizationMode) => {
    setSelectedMode(mode);
    const result = optimizeLayout(currentLayout, mode);
    setOptimizationResult(result);

    // Apply the optimization
    const optimizedLayout = applyLayoutActions(currentLayout, result.actions);
    setCurrentLayout(optimizedLayout);
    setShowComparison(true);
  };

  const handleReset = () => {
    setCurrentLayout(originalLayout);
    setOptimizationResult(null);
    setSelectedMode(null);
    setShowComparison(false);
  };

  const handleRunScenario = () => {
    // For what-if scenarios - create a copy for comparison
    setShowComparison(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#000000", "#001a1a", "#000000"]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.title}>AI Optimization</Text>
            <Text style={styles.subtitle}>
              Optimize your factory layout for safety, efficiency, or throughput
            </Text>
          </View>

          {/* Optimization Mode Selector */}
          <View style={styles.modeSelector}>
            <Text style={styles.sectionTitle}>Select Optimization Mode</Text>
            <View style={styles.modeGrid}>
              <OptimizationModeCard
                mode="safety"
                icon="🛡️"
                title="Safety Mode"
                description="Auto-correct OSHA spacing violations"
                isSelected={selectedMode === "safety"}
                onPress={() => handleOptimize("safety")}
              />
              <OptimizationModeCard
                mode="efficiency"
                icon="⚡"
                title="Efficiency Mode"
                description="Minimize travel distance"
                isSelected={selectedMode === "efficiency"}
                onPress={() => handleOptimize("efficiency")}
              />
              <OptimizationModeCard
                mode="throughput"
                icon="🚀"
                title="Throughput Mode"
                description="Reduce bottlenecks"
                isSelected={selectedMode === "throughput"}
                onPress={() => handleOptimize("throughput")}
              />
            </View>
          </View>

          {/* Optimization Result Summary */}
          {optimizationResult && (
            <View style={styles.resultSummary}>
              <LinearGradient
                colors={["rgba(139, 92, 246, 0.15)", "rgba(59, 130, 246, 0.15)"]}
                style={styles.resultGradient}
              >
                <Text style={styles.resultIcon}>✨</Text>
                <Text style={styles.resultTitle}>Optimization Complete</Text>
                <Text style={styles.resultText}>{optimizationResult.summary}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Current Layout */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {showComparison ? "Optimized Layout" : "Current Layout"}
              </Text>
              {showComparison && (
                <Pressable onPress={handleReset} style={styles.resetButton}>
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>
              )}
            </View>
            <FloorPlanEditor items={currentLayout} />
          </View>

          {/* Impact Dashboard */}
          <View style={styles.section}>
            <ImpactDashboard
              metrics={currentMetrics}
              comparisonMetrics={showComparison ? originalMetrics : undefined}
            />
          </View>

          {/* Constraint Checker */}
          <View style={styles.section}>
            <ConstraintChecker violations={currentViolations} />
          </View>

          {/* What-If Scenarios */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What-If Scenarios</Text>
            <View style={styles.scenarioGrid}>
              <ScenarioCard
                icon="➕"
                title="Add Equipment"
                description="What if we add a new CNC machine?"
                onPress={() => handleRunScenario()}
              />
              <ScenarioCard
                icon="🔄"
                title="Rearrange"
                description="What if we move welding closer to dock?"
                onPress={() => handleRunScenario()}
              />
              <ScenarioCard
                icon="📏"
                title="Expand Area"
                description="What if we expand to the next bay?"
                onPress={() => handleRunScenario()}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/preview")}
            >
              <Text style={styles.secondaryButtonText}>View in 3D</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                // Export or save functionality
                alert("Export functionality coming soon!");
              }}
            >
              <LinearGradient
                colors={["#8b5cf6", "#6366f1"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Export Layout</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

type OptimizationModeCardProps = {
  mode: OptimizationMode;
  icon: string;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
};

function OptimizationModeCard({
  mode,
  icon,
  title,
  description,
  isSelected,
  onPress,
}: OptimizationModeCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.modeCard,
        isSelected && styles.modeCardSelected,
        {
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.modeIcon}>{icon}</Text>
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeDescription}>{description}</Text>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>Active</Text>
        </View>
      )}
    </Pressable>
  );
}

type ScenarioCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
};

function ScenarioCard({ icon, title, description, onPress }: ScenarioCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.scenarioCard,
        {
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.scenarioIcon}>{icon}</Text>
      <Text style={styles.scenarioTitle}>{title}</Text>
      <Text style={styles.scenarioDescription}>{description}</Text>
    </Pressable>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    gap: 20,
  },
  header: {
    marginBottom: 10,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: "#8b5cf6",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
  },
  modeSelector: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  modeGrid: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modeCardSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  modeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 18,
  },
  selectedBadge: {
    marginTop: 8,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  resultSummary: {
    marginBottom: 10,
  },
  resultGradient: {
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  resultIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resetButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  resetText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
  },
  scenarioGrid: {
    gap: 10,
  },
  scenarioCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scenarioIcon: {
    fontSize: 28,
  },
  scenarioTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  scenarioDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    flex: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    marginBottom: 30,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  buttonGradient: {
    padding: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
