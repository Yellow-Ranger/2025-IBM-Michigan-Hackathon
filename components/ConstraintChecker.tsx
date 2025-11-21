import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useEffect } from "react";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { ConstraintViolation } from "@/utils/layoutOptimizer";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  violations: ConstraintViolation[];
  onViolationPress?: (violation: ConstraintViolation) => void;
};

export function ConstraintChecker({ violations, onViolationPress }: Props) {
  const criticalCount = violations.filter((v) => v.severity === "critical").length;
  const warningCount = violations.filter((v) => v.severity === "warning").length;
  const infoCount = violations.filter((v) => v.severity === "info").length;

  const getSeverityColor = (severity: ConstraintViolation["severity"]) => {
    switch (severity) {
      case "critical":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
    }
  };

  const getSeverityIcon = (severity: ConstraintViolation["severity"]) => {
    switch (severity) {
      case "critical":
        return "🚨";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
    }
  };

  const getSeverityLabel = (severity: ConstraintViolation["severity"]) => {
    switch (severity) {
      case "critical":
        return "CRITICAL";
      case "warning":
        return "WARNING";
      case "info":
        return "INFO";
    }
  };

  const pulseAnimation = useSharedValue(1);

  useEffect(() => {
    if (violations.length === 0) {
      // Gentle pulse for success state
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [violations.length]);

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  if (violations.length === 0) {
    return (
      <Animated.View
        style={styles.container}
        entering={FadeInUp.duration(600).springify()}
      >
        <Animated.View style={[styles.successHeader, successAnimatedStyle]}>
          <Text style={styles.successIcon}>✓</Text>
          <View style={styles.successTextContainer}>
            <Text style={styles.successTitle}>All Constraints Met</Text>
            <Text style={styles.successSubtitle}>
              Layout passes OSHA safety standards
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={styles.container}
      entering={FadeInUp.duration(600).springify()}
    >
      <Animated.View
        style={styles.header}
        entering={FadeInDown.delay(100).duration(500).springify()}
      >
        <Text style={styles.title}>Constraint Checker</Text>
        <View style={styles.summaryRow}>
          {criticalCount > 0 && (
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={[styles.badge, { backgroundColor: "#ef4444" }]}
            >
              <Text style={styles.badgeText}>{criticalCount} Critical</Text>
            </Animated.View>
          )}
          {warningCount > 0 && (
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              style={[styles.badge, { backgroundColor: "#f59e0b" }]}
            >
              <Text style={styles.badgeText}>{warningCount} Warnings</Text>
            </Animated.View>
          )}
          {infoCount > 0 && (
            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              style={[styles.badge, { backgroundColor: "#3b82f6" }]}
            >
              <Text style={styles.badgeText}>{infoCount} Info</Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {violations.map((violation, index) => (
          <AnimatedPressable
            key={violation.id}
            entering={FadeInDown.delay(index * 80 + 500)
              .duration(400)
              .springify()}
            style={({ pressed }) => [
              styles.violationCard,
              {
                borderLeftColor: getSeverityColor(violation.severity),
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={() => onViolationPress?.(violation)}
          >
            <View style={styles.violationHeader}>
              <Text style={styles.severityIcon}>
                {getSeverityIcon(violation.severity)}
              </Text>
              <Text
                style={[
                  styles.severityLabel,
                  { color: getSeverityColor(violation.severity) },
                ]}
              >
                {getSeverityLabel(violation.severity)}
              </Text>
            </View>

            <Text style={styles.violationMessage}>{violation.message}</Text>

            <View style={styles.violationFooter}>
              <Text style={styles.violationType}>
                {formatViolationType(violation.type)}
              </Text>
              {violation.position && (
                <Text style={styles.position}>
                  @ ({violation.position.x.toFixed(0)}, {violation.position.y.toFixed(0)})
                </Text>
              )}
            </View>
          </AnimatedPressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function formatViolationType(
  type: ConstraintViolation["type"]
): string {
  switch (type) {
    case "overlap":
      return "Equipment Overlap";
    case "clearance":
      return "OSHA Clearance";
    case "aisle_blocked":
      return "Aisle Width";
    case "turning_radius":
      return "Forklift Turning";
    case "emergency_exit":
      return "Emergency Exit";
    case "power_drop":
      return "Power Distribution";
    default:
      return type;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    maxHeight: 400,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 10,
  },
  violationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  violationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  severityIcon: {
    fontSize: 16,
  },
  severityLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  violationMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 8,
    lineHeight: 20,
  },
  violationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  violationType: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
  },
  position: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "monospace",
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  successIcon: {
    fontSize: 32,
    color: "#22c55e",
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22c55e",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: "rgba(34, 197, 94, 0.8)",
  },
});
