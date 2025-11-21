import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#000",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "600",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "LiDAR Room Scanner",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="scan-webview"
          options={{
            title: "Scan Room",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="gallery"
          options={{
            title: "Gallery",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="preview"
          options={{
            title: "Scan Preview",
            headerShown: true,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
