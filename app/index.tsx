import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ParticleWaveBackground from "../components/ParticleWaveBackground";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const PRIMARY = "#0f58c1";

export default function Home() {
  const router = useRouter();
  const focusPoint = useMemo(
    () => ({ x: screenWidth / 2, y: screenHeight * 0.55 }),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvas}>
        <ParticleWaveBackground color={PRIMARY} focus={focusPoint} />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.topActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
                onPress={() => router.push("/gallery")}
                accessibilityLabel="View gallery"
              >
                <MaterialCommunityIcons
                  name="image-multiple-outline"
                  size={18}
                  color={PRIMARY}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
                onPress={() => router.push("/optimize" as any)}
                accessibilityLabel="AI Optimize"
              >
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={18}
                  color={PRIMARY}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
                onPress={() => router.push("/info")}
                accessibilityLabel="Info"
              >
                <MaterialCommunityIcons
                  name="information-outline"
                  size={18}
                  color={PRIMARY}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.header}>
            <Image
              source={require("../assets/appicon.jpg")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Project Lyoko icon"
            />
            <Text style={styles.title}>Project Lyoko</Text>
            <Text style={styles.subtitle}>
              Scan rooms or redesign the floor with Watsonx
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cameraButton,
              pressed && styles.cameraButtonPressed,
            ]}
            onPress={() => router.push("/native-scan")}
          >
            <MaterialCommunityIcons name="camera" size={56} color="#f6fbff" />
            <Text style={styles.cameraHint}>Tap to start</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>LiDAR support</Text>
            <Text style={styles.footerText}>Photo Fallback</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  canvas: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  topRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  iconButtonPressed: {
    opacity: 0.65,
  },
  header: {
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(15, 88, 193, 0.08)",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: "400",
    color: PRIMARY,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#1f406f",
    textAlign: "center",
    marginTop: 6,
  },
  cameraButton: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    gap: 8,
  },
  cameraButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  cameraHint: {
    fontSize: 14,
    color: "#f6fbff",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  footerText: {
    fontSize: 20,
    color: PRIMARY,
    fontWeight: "400",
    letterSpacing: -0.1,
  },
});
