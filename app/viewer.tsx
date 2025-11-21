import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import { getScanById, SavedScan, formatScanDate } from "@/utils/scanStorage";

function buildViewerHtml(stlBase64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #050505; }
    #viewer { width: 100%; height: 100%; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.159.0/examples/js/controls/OrbitControls.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.159.0/examples/js/loaders/STLLoader.js"></script>
</head>
<body>
  <div id="viewer"></div>
  <script>
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor('#050505');
    document.getElementById('viewer').appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;

    const ambient = new THREE.AmbientLight('#b0c4ff', 0.4);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight('#89c3ff', 0.9);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#89c3ff', 0.45);
    fillLight.position.set(-4, 6, -3);
    scene.add(fillLight);

    const stlBase64 = "${stlBase64}";
    const stlText = atob(stlBase64);
    const buffer = new TextEncoder().encode(stlText).buffer;
    const loader = new THREE.STLLoader();
    const geometry = loader.parse(buffer);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      color: '#00d4ff',
      metalness: 0.15,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    mesh.position.sub(center);
    scene.add(mesh);

    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.4 || 6;
    camera.position.set(distance, distance * 0.8, distance);
    controls.target.set(0, 0, 0);
    controls.update();

    const grid = new THREE.GridHelper(maxDim * 2.5 || 10, 12, '#1e293b', '#1e293b');
    scene.add(grid);

    const animate = () => {
      requestAnimationFrame(animate);
      mesh.rotation.y += 0.003;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', () => {
      const { innerWidth, innerHeight } = window;
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  </script>
</body>
</html>`;
}

export default function ViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scanId?: string }>();
  const [scan, setScan] = useState<SavedScan | null>(null);
  const [viewerHtml, setViewerHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const scanId = params.scanId as string | undefined;

  useEffect(() => {
    const load = async () => {
      try {
        if (!scanId) {
          setError("Missing scan ID");
          setLoading(false);
          return;
        }

        const savedScan = await getScanById(scanId);
        if (!savedScan) {
          setError("Scan not found");
          setLoading(false);
          return;
        }
        if (!savedScan.stlUrl) {
          setError("This scan does not include an STL yet.");
          setLoading(false);
          return;
        }

        const resolvedPath = savedScan.stlUrl.startsWith("file://")
          ? savedScan.stlUrl
          : `file://${savedScan.stlUrl}`;
        const info = await FileSystem.getInfoAsync(resolvedPath);
        if (!info.exists) {
          setError("The STL file could not be found on this device.");
          setLoading(false);
          return;
        }

        const stlBase64 = await FileSystem.readAsStringAsync(resolvedPath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setScan(savedScan);
        setViewerHtml(buildViewerHtml(stlBase64));
      } catch (err) {
        console.error("Failed to load STL viewer", err);
        setError("Failed to open the STL viewer.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scanId]);

  const headerText = useMemo(() => {
    if (!scan) return "3D Viewer";
    return `${scan.scanMode === "lidar" ? "LiDAR" : "Photo"} — ${formatScanDate(scan.timestamp)}`;
  }, [scan]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Preparing 3D view...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !viewerHtml) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error ?? "Unable to render STL."}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back to Gallery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>3D Viewer</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
      </View>
      <View style={styles.viewerCard}>
        <WebView
          originWhitelist={["*"]}
          style={styles.webView}
          source={{ html: viewerHtml }}
          scrollEnabled={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
  },
  viewerCard: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.2)",
  },
  webView: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    textAlign: "center",
  },
  backButton: {
    marginTop: 12,
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.4)",
  },
  backButtonText: {
    color: "#00d4ff",
    fontWeight: "700",
  },
});
