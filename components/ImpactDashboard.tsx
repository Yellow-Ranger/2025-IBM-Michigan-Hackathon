import { View, Text, StyleSheet } from "react-native";
import { useEffect } from "react";
import Animated, {
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { OptimizationMetrics } from "@/utils/layoutOptimizer";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  metrics: OptimizationMetrics;
  comparisonMetrics?: OptimizationMetrics; // Optional: for before/after comparison
};

export function ImpactDashboard({ metrics, comparisonMetrics }: Props) {
  return (
    <Animated.View
      style={styles.container}
      entering={FadeInUp.duration(600).springify()}
    >
      <Text style={styles.title}>Impact Dashboard</Text>

      <View style={styles.metricsGrid}>
        <ScoreCard
          label="Safety"
          score={metrics.safetyScore}
          icon="🛡️"
          color={["#ef4444", "#dc2626"]}
          delay={0}
        />
        <ScoreCard
          label="Efficiency"
          score={metrics.efficiencyScore}
          icon="⚡"
          color={["#3b82f6", "#2563eb"]}
          delay={100}
        />
        <ScoreCard
          label="Throughput"
          score={metrics.throughputScore}
          icon="🚀"
          color={["#8b5cf6", "#7c3aed"]}
          delay={200}
        />
      </View>

      <View style={styles.detailsGrid}>
        <MetricDetail
          label="Travel Distance"
          value={`${metrics.totalTravelDistance.toFixed(0)} ft`}
          icon="🚶"
          delay={300}
          improvement={
            comparisonMetrics
              ? calculateImprovement(
                  comparisonMetrics.totalTravelDistance,
                  metrics.totalTravelDistance
                )
              : null
          }
        />
        <MetricDetail
          label="Space Utilization"
          value={`${metrics.spaceUtilization.toFixed(1)}%`}
          icon="📐"
          delay={400}
          improvement={
            comparisonMetrics
              ? calculateImprovement(
                  comparisonMetrics.spaceUtilization,
                  metrics.spaceUtilization,
                  true
                )
              : null
          }
        />
        <MetricDetail
          label="OSHA Clearance"
          value={metrics.oshaClearancePass ? "Pass" : "Fail"}
          icon={metrics.oshaClearancePass ? "✅" : "❌"}
          delay={500}
          statusColor={metrics.oshaClearancePass ? "#22c55e" : "#ef4444"}
        />
        <MetricDetail
          label="Blocked Aisles"
          value={`${metrics.blockedAisles}`}
          icon="🚧"
          delay={600}
          statusColor={metrics.blockedAisles === 0 ? "#22c55e" : "#f59e0b"}
        />
        <MetricDetail
          label="Equipment Overlaps"
          value={`${metrics.equipmentOverlaps}`}
          icon="⚠️"
          delay={700}
          statusColor={metrics.equipmentOverlaps === 0 ? "#22c55e" : "#ef4444"}
        />
      </View>

      {comparisonMetrics && (
        <Animated.View
          style={styles.summaryCard}
          entering={FadeInUp.delay(800).duration(500).springify()}
        >
          <Text style={styles.summaryTitle}>💡 Optimization Impact</Text>
          <Text style={styles.summaryText}>
            {generateSummary(metrics, comparisonMetrics)}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

type ScoreCardProps = {
  label: string;
  score: number;
  icon: string;
  color: string[];
  delay: number;
};

function ScoreCard({ label, score, icon, color, delay }: ScoreCardProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(score / 100, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      })
    );
    scale.value = withDelay(delay, withSpring(1, { damping: 10 }));
  }, [score, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <Animated.View
      style={[styles.scoreCard, animatedStyle]}
      entering={FadeInRight.delay(delay).duration(500).springify()}
    >
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreIcon}>{icon}</Text>
        <Text style={styles.scoreLabel}>{label}</Text>
      </View>

      <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
        {Math.round(score)}
      </Text>

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            progressStyle,
            { backgroundColor: getScoreColor(score) },
          ]}
        />
      </View>
    </Animated.View>
  );
}

type MetricDetailProps = {
  label: string;
  value: string;
  icon: string;
  delay: number;
  improvement?: number | null;
  statusColor?: string;
};

function MetricDetail({
  label,
  value,
  icon,
  delay,
  improvement,
  statusColor,
}: MetricDetailProps) {
  const scale = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.metricCard, animatedStyle]}
      entering={FadeInUp.delay(delay).duration(400).springify()}
    >
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, statusColor && { color: statusColor }]}>
        {value}
      </Text>

      {improvement !== null && improvement !== undefined && (
        <View
          style={[
            styles.improvementBadge,
            { backgroundColor: improvement > 0 ? "#22c55e" : "#ef4444" },
          ]}
        >
          <Text style={styles.improvementText}>
            {improvement > 0 ? "+" : ""}
            {improvement.toFixed(1)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

function calculateImprovement(
  before: number,
  after: number,
  higherIsBetter: boolean = false
): number {
  if (before === 0) return 0;

  const change = ((after - before) / before) * 100;

  // For metrics where lower is better (like travel distance), invert the sign
  return higherIsBetter ? change : -change;
}

function generateSummary(
  metrics: OptimizationMetrics,
  comparison: OptimizationMetrics
): string {
  const improvements: string[] = [];

  if (metrics.safetyScore > comparison.safetyScore) {
    improvements.push(
      `Safety improved by ${(metrics.safetyScore - comparison.safetyScore).toFixed(0)} points`
    );
  }

  if (metrics.totalTravelDistance < comparison.totalTravelDistance) {
    const saved = comparison.totalTravelDistance - metrics.totalTravelDistance;
    improvements.push(`Reduced travel by ${saved.toFixed(0)} ft/day`);
  }

  if (metrics.equipmentOverlaps < comparison.equipmentOverlaps) {
    improvements.push(
      `Fixed ${comparison.equipmentOverlaps - metrics.equipmentOverlaps} overlaps`
    );
  }

  if (metrics.oshaClearancePass && !comparison.oshaClearancePass) {
    improvements.push("Now meets OSHA standards");
  }

  if (improvements.length === 0) {
    return "Layout maintains current optimization level.";
  }

  return improvements.join(" • ");
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  scoreIcon: {
    fontSize: 18,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    lineHeight: 13,
    flexShrink: 1,
    flex: 1,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 4,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  improvementBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  improvementText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#a78bfa",
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
});
