import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const PRIMARY = "#0f58c1";

export default function InfoScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#0b0f24", "#0f2745", "#0a3c64"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>360° Room Scanner</Text>
            <Text style={styles.subtitle}>
              Create precise 3D models of your rooms using guided 360°
              photogrammetry
            </Text>
          </View>

          <View style={styles.cards}>
            <View style={styles.card}>
              <MaterialCommunityIcons
                name="camera-iris"
                size={34}
                color="#e5e9f5"
              />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Guided Capture</Text>
                <Text style={styles.cardBody}>
                  Follow on-screen instructions for perfect 360° coverage
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <MaterialCommunityIcons
                name="cube-outline"
                size={34}
                color="#e5e9f5"
              />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>3D Reconstruction</Text>
                <Text style={styles.cardBody}>
                  Automatic photogrammetry processing in the cloud
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <MaterialCommunityIcons
                name="ruler-square"
                size={34}
                color="#e5e9f5"
              />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>STL Export</Text>
                <Text style={styles.cardBody}>
                  Download ready-to-use models
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f24",
  },
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#f8fbff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#d9deec",
    lineHeight: 22,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  cardText: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f6fbff",
  },
  cardBody: {
    fontSize: 14,
    color: "#c6cee2",
    lineHeight: 20,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  closeButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
