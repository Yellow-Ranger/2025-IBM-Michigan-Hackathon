import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  NativeModules,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Asset } from "expo-asset";
import { useNativeOrientation } from "@/hooks/useNativeOrientation";
import { useCaptureStore } from "@/utils/captureStore";
import {
  headingToSegment,
  normalizeHeading,
  isInCeilingRange,
  isInFloorRange,
  calculateRotationSpeed,
  isSpeedAcceptable,
} from "@/utils/nativeCaptureUtils";
import { saveScan } from "@/utils/scanStorage";
import { hasRoomPlan } from "@/utils/deviceDetection";
import { ENABLE_ROOMPLAN, GENERATE_MOCK_STL } from "@/utils/featureFlags";
import * as FileSystem from "expo-file-system/legacy";
import { CoverageRing } from "@/components/CoverageRing";
import { generateMockSTLFromPhotos } from "@/utils/mockStlGenerator";

// Capture throttles (ms)
const HORIZONTAL_CAPTURE_DELAY = 200;
const HORIZONTAL_FALLBACK_DELAY = 500;
const VERTICAL_CAPTURE_DELAY = 140; // quicker cadence for ceiling/floor sweeps
const VERTICAL_FALLBACK_DELAY = 320;

type RoomPlanExportEvent = {
  nativeEvent?: {
    scanUrl?: string;
    jsonUrl?: string;
  };
};

type RoomPlanModule = typeof import("expo-roomplan");

type RoomPlanScannerProps = {
  roomPlanModule: RoomPlanModule;
};

const isRoomPlanNativeModuleAvailable = () =>
  Platform.OS === "ios" &&
  Boolean((NativeModules as any)?.ExpoRoomPlan);

async function copyRoom2STLToScans(): Promise<string> {
  const asset = Asset.fromModule(require("../assets/room2.stl"));
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const sourceUri = asset.localUri ?? asset.uri;
  const directory = `${FileSystem.documentDirectory}scans/`;
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  const destination = `${directory}room2_${Date.now()}.stl`;
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destination,
  });

  return destination;
}

function RoomPlanScanner({ roomPlanModule }: RoomPlanScannerProps) {
  const { useRoomPlanView, RoomPlanView, ExportType } = roomPlanModule;
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Ready to scan with RoomPlan");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userFriendlyMessage, setUserFriendlyMessage] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | undefined>();
  const hasSavedRef = useRef(false);
  const cameraRef = useRef<any>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to convert technical messages to user-friendly ones
  const formatUserFriendlyMessage = (status: string, error?: string): string | null => {
    // Clear previous timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    // Handle error messages
    if (error) {
      const lowerError = error.toLowerCase();
      if (lowerError.includes("light") || lowerError.includes("dark")) {
        return "💡 More light required - Move to a brighter area";
      }
      if (lowerError.includes("texture") || lowerError.includes("feature")) {
        return "🎨 Not enough detail - Point at textured surfaces";
      }
      if (lowerError.includes("motion") || lowerError.includes("fast")) {
        return "🐌 Moving too fast - Slow down your movements";
      }
      if (lowerError.includes("distance")) {
        return "📏 Too close or too far - Adjust your distance";
      }
      // Generic error message
      return `⚠️ ${error}`;
    }

    // Handle status messages
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("scanning") || lowerStatus === "running") {
      return "📱 Scanning in progress - Slowly pan around the room";
    }
    if (lowerStatus.includes("initializing")) {
      return "🔄 Getting ready to scan...";
    }
    if (lowerStatus.includes("done") || lowerStatus.includes("complete")) {
      return "✅ Scan complete!";
    }
    if (lowerStatus.includes("preview")) {
      return "👀 Review your scan";
    }

    return null;
  };

  const handleStatus = (e: {
    nativeEvent: { status: any; errorMessage?: string };
  }) => {
    const { status: nextStatus, errorMessage: error } = e.nativeEvent;
    console.log(
      "[RoomPlan] status:",
      nextStatus,
      error ? `- ${error}` : ""
    );

    if (nextStatus) {
      setStatus(nextStatus);
    }

    // Update error message
    setErrorMessage(error || null);

    // Generate user-friendly message
    const friendlyMsg = formatUserFriendlyMessage(nextStatus, error);
    setUserFriendlyMessage(friendlyMsg);

    // Auto-hide non-error messages after 5 seconds
    if (friendlyMsg && !error) {
      messageTimeoutRef.current = setTimeout(() => {
        setUserFriendlyMessage(null);
      }, 5000);
    }
  };

  const handleExported = async (e: {
    nativeEvent: { scanUrl?: string; jsonUrl?: string };
  }) => {
    console.log("[RoomPlan] exported:", e.nativeEvent);
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    await handleSave(e.nativeEvent.scanUrl, e.nativeEvent.jsonUrl);
  };

  const handlePreview = () => {
    console.log("[RoomPlan] preview presented");
    setStatus("Previewing capture");
  };

  const { viewProps, controls, state } = useRoomPlanView({
    scanName: `room-${Date.now()}`,
    exportType: ExportType.Parametric,
    exportOnFinish: true,
    sendFileLoc: true,
    autoCloseOnTerminalStatus: false,
    onStatus: handleStatus,
    onPreview: handlePreview,
    onExported: handleExported,
  });

  useEffect(() => {
    if (showScanner && !state.isRunning && !saving) {
      setShowScanner(false);
    }
  }, [showScanner, state.isRunning, saving]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = async (usdzUrl?: string, jsonUrl?: string) => {
    setSaving(true);
    try {
      await saveScan({
        scanMode: "lidar",
        pointCount: 0,
        data: { points: [] },
        roomPlan: {
          usdzUrl,
          jsonUrl,
          exportType: "parametric",
        },
        thumbnail: thumbnailUri,
      });

      Alert.alert(
        "RoomPlan Scan Saved",
        "Your LiDAR scan has been exported. You can find it in the Gallery.",
        [
          {
            text: "View Gallery",
            onPress: () => router.push("/gallery"),
          },
          {
            text: "OK",
            style: "default",
          },
        ]
      );
    } catch (error) {
      console.error("Failed to save RoomPlan scan:", error);
      Alert.alert("Error", "Failed to save RoomPlan scan.");
    } finally {
      setSaving(false);
      setShowScanner(false);
      setThumbnailUri(undefined);
    }
  };

  const captureThumbnail = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });

      if (photo && photo.uri) {
        const filename = `roomplan_thumb_${Date.now()}.jpg`;
        const directory = `${FileSystem.documentDirectory}thumbnails/`;

        const dirInfo = await FileSystem.getInfoAsync(directory);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        }

        const newPath = `${directory}${filename}`;
        await FileSystem.moveAsync({
          from: photo.uri,
          to: newPath,
        });

        setThumbnailUri(newPath);
      }
    } catch (error) {
      console.error("Failed to capture thumbnail:", error);
    }
  };

  const openScanner = async () => {
    // Capture a thumbnail before starting the scan
    await captureThumbnail();

    hasSavedRef.current = false;
    setStatus("Scanning...");
    setShowScanner(true);
    controls.start();
  };

  const onCancel = () => {
    controls.cancel();
    setShowScanner(false);
  };

  const onFinish = () => {
    controls.finishScan();
  };

  const onNewRoom = () => {
    controls.addRoom();
  };

  return (
    <View style={styles.container}>
      {!showScanner && !saving && (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.overlay}>
            <View style={styles.instructionsBox}>
              <Text style={styles.title}>LiDAR Scan (RoomPlan)</Text>
              <Text style={styles.subtitle}>
                This device supports Apple RoomPlan. Start a LiDAR-native capture for
                a quick, high-fidelity room mesh.
              </Text>
              <Pressable style={styles.startButton} onPress={openScanner}>
                <Text style={styles.startButtonText}>Start RoomPlan Scan</Text>
              </Pressable>
              <Text style={styles.statusText}>Status: {status}</Text>
            </View>
          </View>
        </>
      )}

      {showScanner && (
        <View style={styles.overlayFull}>
          <RoomPlanView style={StyleSheet.absoluteFill} {...viewProps} />

          {/* User-friendly message overlay */}
          {userFriendlyMessage && (
            <View style={styles.messageOverlay}>
              <View style={[
                styles.messageBox,
                errorMessage ? styles.messageBoxError : styles.messageBoxInfo
              ]}>
                <Text style={styles.messageText}>{userFriendlyMessage}</Text>
              </View>
            </View>
          )}

          <View style={styles.roomPlanControls}>
            <Pressable
              style={styles.roomPlanControlButton}
              onPress={onCancel}
            >
              <Text style={styles.roomPlanControlText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.roomPlanControlButton}
              onPress={onFinish}
            >
              <Text style={styles.roomPlanControlText}>Finish</Text>
            </Pressable>
            <Pressable
              style={styles.roomPlanControlButton}
              onPress={onNewRoom}
            >
              <Text style={styles.roomPlanControlText}>Add Room</Text>
            </Pressable>
          </View>
        </View>
      )}

      {saving && (
        <View style={styles.overlay}>
          <View style={styles.instructionsBox}>
            <Text style={styles.title}>💾 Saving RoomPlan...</Text>
            <Text style={styles.subtitle}>Exporting USDZ locally</Text>
            <ActivityIndicator color="#00d4ff" style={{ marginTop: 12 }} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function NativeScan() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedScanMode = (params.scanMode as "auto" | "lidar" | "photo") || "auto";
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const {
    orientation,
    permission: orientationPermission,
    requestPermission: requestOrientationPermission,
  } = useNativeOrientation();

  const lastCaptureTimeRef = useRef<number>(0);
  const lastHeadingRef = useRef<number | null>(null);
  const lastHeadingTimeRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);
  const [speedWarning, setSpeedWarning] = useState<boolean>(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [roomPlanAvailable, setRoomPlanAvailable] = useState<boolean>(false);
  const [roomPlanModule, setRoomPlanModule] = useState<RoomPlanModule | null>(
    null
  );
  const [roomPlanError, setRoomPlanError] = useState<string | null>(null);
  const [deviceCheckComplete, setDeviceCheckComplete] =
    useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        // Only check for RoomPlan if the feature flag is enabled
        const deviceSupportsRoomPlan = ENABLE_ROOMPLAN ? await hasRoomPlan() : false;

        // Respect user's scan mode selection
        let shouldUseRoomPlan = false;
        if (selectedScanMode === "auto") {
          // Auto mode: use RoomPlan if available
          shouldUseRoomPlan = deviceSupportsRoomPlan;
        } else if (selectedScanMode === "lidar") {
          // Force LiDAR mode: use RoomPlan if available
          shouldUseRoomPlan = deviceSupportsRoomPlan;
        } else if (selectedScanMode === "photo") {
          // Force photo mode: never use RoomPlan
          shouldUseRoomPlan = false;
        }

        if (mounted) {
          setRoomPlanAvailable(shouldUseRoomPlan);
        }
      } catch (err) {
        console.warn("RoomPlan capability check failed", err);
      } finally {
        if (mounted) {
          setDeviceCheckComplete(true);
        }
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [selectedScanMode]);

  useEffect(() => {
    let cancelled = false;

    if (!roomPlanAvailable) {
      setRoomPlanModule(null);
      setRoomPlanError(null);
      return;
    }

    if (!isRoomPlanNativeModuleAvailable()) {
      setRoomPlanError(
        "RoomPlan native module missing. Run a custom dev client (expo run:ios) or an EAS build with expo-roomplan; Expo Go cannot load RoomPlan."
      );
      setRoomPlanModule(null);
      return;
    }

    (async () => {
      try {
        const mod = await import("expo-roomplan");
        if (!cancelled) {
          setRoomPlanModule(mod);
        }
      } catch (error) {
        console.warn("RoomPlan module unavailable", error);
        if (!cancelled) {
          setRoomPlanError(
            "RoomPlan native module missing. Rebuild the dev client or create a new EAS build with expo-roomplan installed."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomPlanAvailable]);

  // Refs to track segments for the capture loop
  const coveredSegmentsRef = useRef<Set<number>>(new Set());
  const ceilingSegmentsRef = useRef<Set<number>>(new Set());
  const floorSegmentsRef = useRef<Set<number>>(new Set());
  const orientationRef = useRef(orientation);
  const currentPositionRef = useRef<number>(1);

  const {
    step,
    currentPosition,
    coveredSegments,
    ceilingSegments,
    floorSegments,
    setStep,
    setPosition,
    markSegmentCovered,
    markCeilingSegmentCovered,
    markFloorSegmentCovered,
    addImage,
    canProceedToVertical,
    canProceedToFloor,
    canFinishPosition,
  } = useCaptureStore();

  // Keep refs in sync with state
  useEffect(() => {
    coveredSegmentsRef.current = coveredSegments;
  }, [coveredSegments]);

  useEffect(() => {
    ceilingSegmentsRef.current = ceilingSegments;
  }, [ceilingSegments]);

  useEffect(() => {
    floorSegmentsRef.current = floorSegments;
  }, [floorSegments]);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    currentPositionRef.current = currentPosition;
  }, [currentPosition]);

  // Maintain preview URLs for recent captures
  useEffect(() => {
    if (capturedImages.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const latestImages = capturedImages.slice(-4);
    setPreviewUrls(latestImages);
  }, [capturedImages]);

  // Capture loop
  useEffect(() => {
    if (roomPlanAvailable || !deviceCheckComplete) return;

    if (
      step === "initial" ||
      step === "uploading" ||
      step === "second-position-prompt"
    ) {
      console.log("⚠️ Capture loop not starting:", { step });
      return;
    }

    if (!cameraRef.current) {
      console.log("⚠️ Camera ref not ready yet");
      return;
    }

    console.log("🎬 Starting capture loop for step:", step);

    const interval = setInterval(async () => {
      const now = Date.now();
      const currentOrientation = orientationRef.current;
      const heading = normalizeHeading(currentOrientation.alpha);
      const pitch = currentOrientation.beta;

      // Horizontal rotation capture
      if (step === "horizontal-rotation" || step === "second-rotation") {
        const totalSegments = 24;

        if (heading !== null) {
          const previousHeading = lastHeadingRef.current;
          const previousHeadingTime = lastHeadingTimeRef.current;

          if (previousHeading !== null && previousHeadingTime > 0) {
            const deltaTime = now - previousHeadingTime;
            const speed = calculateRotationSpeed(
              previousHeading,
              heading,
              deltaTime
            );

            if (!isSpeedAcceptable(speed)) {
              if (!speedWarning) {
                setSpeedWarning(true);
                setTimeout(() => setSpeedWarning(false), 1500);
              }
              lastHeadingRef.current = heading;
              lastHeadingTimeRef.current = now;
              return;
            }
          }

          const segment = headingToSegment(heading, totalSegments);

          if (
            !coveredSegmentsRef.current.has(segment) &&
            now - lastCaptureTimeRef.current > HORIZONTAL_CAPTURE_DELAY
          ) {
            try {
              await captureFrame(segment, heading, pitch);
              markSegmentCovered(segment);
              lastCaptureTimeRef.current = now;
              console.log(
                `✓ Captured horizontal segment ${segment}/${totalSegments}`
              );
            } catch (err) {
              console.error("Failed to capture frame:", err);
            }
          }

          lastHeadingRef.current = heading;
          lastHeadingTimeRef.current = now;
        } else {
          // Fallback: if no heading data, capture based on time intervals
          const currentSegmentsCount = coveredSegmentsRef.current.size;
          if (
            currentSegmentsCount < totalSegments &&
            now - lastCaptureTimeRef.current > HORIZONTAL_FALLBACK_DELAY
          ) {
            const nextSegment = currentSegmentsCount;
            try {
              await captureFrame(nextSegment, heading, pitch);
              markSegmentCovered(nextSegment);
              lastCaptureTimeRef.current = now;
              console.log(
                `✓ Captured horizontal segment ${nextSegment}/${totalSegments} (time-based)`
              );
            } catch (err) {
              console.error("Failed to capture frame:", err);
            }
          }
        }
      }

      // Ceiling capture
      if (step === "ceiling-capture") {
        const totalSegments = 8;

        if (pitch !== null && isInCeilingRange(pitch)) {
          if (heading !== null) {
            const previousHeading = lastHeadingRef.current;
            const previousHeadingTime = lastHeadingTimeRef.current;

            if (previousHeading !== null && previousHeadingTime > 0) {
              const deltaTime = now - previousHeadingTime;
              const speed = calculateRotationSpeed(
                previousHeading,
                heading,
                deltaTime
              );

              if (!isSpeedAcceptable(speed)) {
                if (!speedWarning) {
                  setSpeedWarning(true);
                  setTimeout(() => setSpeedWarning(false), 1500);
                }
                lastHeadingRef.current = heading;
                lastHeadingTimeRef.current = now;
                return;
              }
            }

            const segment = headingToSegment(heading, totalSegments);

            if (
              !ceilingSegmentsRef.current.has(segment) &&
              now - lastCaptureTimeRef.current > VERTICAL_CAPTURE_DELAY
            ) {
              try {
                await captureFrame(segment, heading, pitch);
                markCeilingSegmentCovered(segment);
                lastCaptureTimeRef.current = now;
                console.log(
                  `✓ Captured ceiling segment ${segment}/${totalSegments}`
                );
              } catch (err) {
                console.error("Failed to capture ceiling frame:", err);
              }
            }

            lastHeadingRef.current = heading;
            lastHeadingTimeRef.current = now;
          } else {
            // Fallback if heading data is unavailable
            const currentSegmentsCount = ceilingSegmentsRef.current.size;
            if (
              currentSegmentsCount < totalSegments &&
              now - lastCaptureTimeRef.current > VERTICAL_FALLBACK_DELAY
            ) {
              const nextSegment = currentSegmentsCount;
              try {
                await captureFrame(nextSegment, heading, pitch);
                markCeilingSegmentCovered(nextSegment);
                lastCaptureTimeRef.current = now;
                console.log(
                  `✓ Captured ceiling segment ${nextSegment}/${totalSegments} (time-based)`
                );
              } catch (err) {
                console.error(
                  "Failed to capture ceiling frame (fallback):",
                  err
                );
              }
            }
          }
        }
      }

      // Floor capture
      if (step === "floor-capture") {
        const totalSegments = 8;

        if (pitch !== null && isInFloorRange(pitch)) {
          if (heading !== null) {
            const previousHeading = lastHeadingRef.current;
            const previousHeadingTime = lastHeadingTimeRef.current;

            if (previousHeading !== null && previousHeadingTime > 0) {
              const deltaTime = now - previousHeadingTime;
              const speed = calculateRotationSpeed(
                previousHeading,
                heading,
                deltaTime
              );

              if (!isSpeedAcceptable(speed)) {
                if (!speedWarning) {
                  setSpeedWarning(true);
                  setTimeout(() => setSpeedWarning(false), 1500);
                }
                lastHeadingRef.current = heading;
                lastHeadingTimeRef.current = now;
                return;
              }
            }

            const segment = headingToSegment(heading, totalSegments);

            if (
              !floorSegmentsRef.current.has(segment) &&
              now - lastCaptureTimeRef.current > VERTICAL_CAPTURE_DELAY
            ) {
              try {
                await captureFrame(segment, heading, pitch);
                markFloorSegmentCovered(segment);
                lastCaptureTimeRef.current = now;
                console.log(
                  `✓ Captured floor segment ${segment}/${totalSegments}`
                );
              } catch (err) {
                console.error("Failed to capture floor frame:", err);
              }
            }

            lastHeadingRef.current = heading;
            lastHeadingTimeRef.current = now;
          } else {
            // Fallback if heading data is unavailable
            const currentSegmentsCount = floorSegmentsRef.current.size;
            if (
              currentSegmentsCount < totalSegments &&
              now - lastCaptureTimeRef.current > VERTICAL_FALLBACK_DELAY
            ) {
              const nextSegment = currentSegmentsCount;
              try {
                await captureFrame(nextSegment, heading, pitch);
                markFloorSegmentCovered(nextSegment);
                lastCaptureTimeRef.current = now;
                console.log(
                  `✓ Captured floor segment ${nextSegment}/${totalSegments} (time-based)`
                );
              } catch (err) {
                console.error("Failed to capture floor frame (fallback):", err);
              }
            }
          }
        }
      }
    }, 100);

    return () => {
      console.log("🛑 Stopping capture loop for step:", step);
      clearInterval(interval);
    };
  }, [step, roomPlanAvailable, deviceCheckComplete]);

  // Auto-advance steps
  useEffect(() => {
    if (roomPlanAvailable || !deviceCheckComplete) return;

    if (step === "horizontal-rotation" || step === "second-rotation") {
      if (canProceedToVertical()) {
        setStep("ceiling-capture");
      }
    }
  }, [coveredSegments, step, roomPlanAvailable, deviceCheckComplete]);

  useEffect(() => {
    if (roomPlanAvailable || !deviceCheckComplete) return;

    if (step === "ceiling-capture" && canProceedToFloor()) {
      setStep("floor-capture");
    }
  }, [ceilingSegments, step, roomPlanAvailable, deviceCheckComplete]);

  useEffect(() => {
    if (roomPlanAvailable || !deviceCheckComplete) return;

    if (step === "floor-capture" && canFinishPosition()) {
      handleComplete();
    }
  }, [
    floorSegments,
    ceilingSegments,
    step,
    currentPosition,
    roomPlanAvailable,
    deviceCheckComplete,
  ]);

  const captureFrame = async (
    segment: number,
    heading: number | null,
    pitch: number | null
  ) => {
    // Prevent concurrent captures
    if (isCapturingRef.current) {
      console.log("Skipping capture - already capturing");
      return;
    }

    // Check if camera is still mounted
    if (!cameraRef.current) {
      console.warn("Camera ref not available, skipping capture");
      return;
    }

    isCapturingRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true, // Skip processing for faster capture
      });

      if (!photo || !photo.uri) {
        console.warn("Photo capture returned invalid result");
        isCapturingRef.current = false;
        return;
      }

      // Save to file system
      const filename = `scan_${Date.now()}_${segment}.jpg`;
      const directory = `${FileSystem.documentDirectory}scans/`;

      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      const newPath = `${directory}${filename}`;
      const normalizedPath = newPath.startsWith("file://")
        ? newPath
        : `file://${newPath}`;
      await FileSystem.moveAsync({
        from: photo.uri,
        to: normalizedPath,
      });

      // Store file path
      setCapturedImages((prev) => [...prev, normalizedPath]);

      // Add to store (we'll use file path as blob placeholder)
      addImage({
        blob: normalizedPath as any, // Store file path instead of blob
        timestamp: Date.now(),
        heading,
        pitch,
        position: currentPositionRef.current as 1 | 2,
      });

      console.log(
        `Captured frame: segment ${segment}, path: ${normalizedPath}`
      );
    } catch (error) {
      console.error("Error capturing frame:", error);
      // Don't throw - just log and continue
    } finally {
      isCapturingRef.current = false;
    }
  };

  const handleComplete = async () => {
    setStep("uploading");

    try {
      let stlUrl: string | undefined;

      try {
        stlUrl = await copyRoom2STLToScans();
      } catch (assetError) {
        console.warn("Failed to attach room2 STL:", assetError);
        if (GENERATE_MOCK_STL) {
          try {
            stlUrl = await generateMockSTLFromPhotos(
              Math.max(capturedImages.length, 1)
            );
          } catch (stlError) {
            console.warn("Failed to generate mock STL:", stlError);
          }
        }
      }

      // Save scan metadata
      const scanId = `scan_${Date.now()}`;
      const thumbnailUri = capturedImages[0] || undefined;
      await saveScan({
        scanMode: "photo",
        pointCount: capturedImages.length,
        data: {
          points: [], // No point cloud data yet
        },
        backendScanId: scanId,
        thumbnail: thumbnailUri,
        stlUrl,
      });

      Alert.alert(
        "Scan Complete!",
        `Captured ${capturedImages.length} images`,
        [
          {
            text: "View Gallery",
            onPress: () => router.push("/gallery"),
          },
          {
            text: "OK",
            style: "default",
          },
        ]
      );
    } catch (error) {
      console.error("Error saving scan:", error);
      Alert.alert("Error", "Failed to save scan");
    }
  };

  if (!deviceCheckComplete) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
        <Text style={styles.loadingText}>Checking device capabilities...</Text>
      </View>
    );
  }

  if (roomPlanAvailable) {
    if (!cameraPermission) {
      return <View style={styles.container} />;
    }

    if (!cameraPermission.granted) {
      return (
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Camera permission required for RoomPlan
            </Text>
            <Pressable
              style={styles.permissionButton}
              onPress={requestCameraPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (roomPlanError) {
      return (
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              {roomPlanError}
            </Text>
            <Text style={styles.permissionText}>
              If you just added expo-roomplan, rebuild your dev client or make a new EAS build.
            </Text>
          </View>
        </View>
      );
    }

    if (!roomPlanModule) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Loading RoomPlan module...</Text>
        </View>
      );
    }

    return <RoomPlanScanner roomPlanModule={roomPlanModule} />;
  }

  if (!cameraPermission || !orientationPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission required</Text>
          <Pressable
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (orientationPermission !== "granted") {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Device orientation permission required
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={requestOrientationPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderContent = () => {
    switch (step) {
      case "initial":
        return (
          <View style={styles.overlay}>
            <View style={styles.instructionsBox}>
              <Text style={styles.title}>360° Room Scan</Text>
              <Text style={styles.subtitle}>
                Stand in a corner. Make sure most of the room is visible.
              </Text>
              <Pressable
                style={styles.startButton}
                onPress={() => setStep("horizontal-rotation")}
              >
                <Text style={styles.startButtonText}>Start Scan</Text>
              </Pressable>
            </View>
          </View>
        );

      case "horizontal-rotation":
      case "second-rotation":
        return (
          <View style={styles.overlay}>
            <View style={styles.topInfo}>
              <Text style={styles.infoTitle}>
                {step === "second-rotation" ? "Position 2" : "Position 1"}
              </Text>
              <Text style={styles.infoText}>
                Slowly sweep the camera to cover the room in front of you
              </Text>
              {speedWarning && (
                <Text style={styles.warningText}>
                  ⚠️ Too fast! Slow down for better quality
                </Text>
              )}
            </View>

            <View style={styles.centerRing}>
              <CoverageRing
                coveredSegments={coveredSegments}
                totalSegments={24}
              />
              <View style={styles.centerText}>
                <Text style={styles.percentageText}>
                  {Math.round((coveredSegments.size / 24) * 100)}%
                </Text>
                <Text style={styles.segmentText}>
                  {coveredSegments.size}/24 segments
                </Text>
              </View>
            </View>

            <View style={styles.bottomInfo}>
              <Text style={styles.progressText}>
                {capturedImages.length} images captured
              </Text>
            </View>
          </View>
        );

      case "ceiling-capture":
        const ceilingInRange =
          orientation.beta !== null && isInCeilingRange(orientation.beta);
        const ceilingTiltSuffix =
          orientation.beta === null
            ? ""
            : ceilingInRange
              ? " ✓"
              : Math.round(orientation.beta) < 45
                ? " (tilt up more)"
                : " (tilt down a bit)";
        return (
          <View style={styles.overlay}>
            <View style={styles.topInfo}>
              <Text style={styles.infoTitle}>Ceiling Sweep</Text>
              <Text style={styles.infoText}>
                Tilt up (45-60°) and slowly sweep 120° to cover the ceiling
              </Text>
              {speedWarning && (
                <Text style={styles.warningText}>
                  ⚠️ Too fast! Slow down for better quality
                </Text>
              )}
              {orientation.beta !== null && (
                <Text style={styles.pitchText}>
                  Current tilt: {Math.round(orientation.beta)}°
                  {ceilingTiltSuffix}
                </Text>
              )}
            </View>

            <View style={styles.centerRing}>
              <CoverageRing
                coveredSegments={ceilingSegments}
                totalSegments={8}
              />
              <View style={styles.centerText}>
                <Text style={styles.percentageText}>
                  {Math.round((ceilingSegments.size / 8) * 100)}%
                </Text>
                <Text style={styles.segmentText}>
                  {ceilingSegments.size}/8 segments
                </Text>
              </View>
            </View>

            <View style={styles.bottomInfo}>
              <Text style={styles.progressText}>
                {capturedImages.filter((img) => img.includes("ceiling")).length}{" "}
                ceiling images captured
              </Text>
            </View>
          </View>
        );

      case "floor-capture":
        const floorInRange =
          orientation.beta !== null && isInFloorRange(orientation.beta);
        const floorTiltSuffix =
          orientation.beta === null
            ? ""
            : floorInRange
              ? " ✓"
              : Math.round(orientation.beta) > -45
                ? " (tilt down more)"
                : " (tilt up a bit)";
        return (
          <View style={styles.overlay}>
            <View style={styles.topInfo}>
              <Text style={styles.infoTitle}>Floor Sweep</Text>
              <Text style={styles.infoText}>
                Tilt down (-45 to -60°) and slowly sweep 120° to cover the floor
              </Text>
              {speedWarning && (
                <Text style={styles.warningText}>
                  ⚠️ Too fast! Slow down for better quality
                </Text>
              )}
              {orientation.beta !== null && (
                <Text style={styles.pitchText}>
                  Current tilt: {Math.round(orientation.beta)}°{floorTiltSuffix}
                </Text>
              )}
            </View>

            <View style={styles.centerRing}>
              <CoverageRing coveredSegments={floorSegments} totalSegments={8} />
              <View style={styles.centerText}>
                <Text style={styles.percentageText}>
                  {Math.round((floorSegments.size / 8) * 100)}%
                </Text>
                <Text style={styles.segmentText}>
                  {floorSegments.size}/8 segments
                </Text>
              </View>
            </View>

            <View style={styles.bottomInfo}>
              <Text style={styles.progressText}>
                {capturedImages.filter((img) => img.includes("floor")).length}{" "}
                floor images captured
              </Text>
            </View>
          </View>
        );

      case "second-position-prompt":
        return (
          <View style={styles.overlay}>
            <View style={styles.instructionsBox}>
              <Text style={styles.title}>Great Work! 🎉</Text>
              <Text style={styles.subtitle}>
                Position 1 complete. Move to opposite corner and repeat.
              </Text>
              <Pressable
                style={styles.startButton}
                onPress={() => {
                  setPosition(2);
                  setStep("second-rotation");
                }}
              >
                <Text style={styles.startButtonText}>Start Second Scan</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={handleComplete}
              >
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </Pressable>
            </View>
          </View>
        );

      case "uploading":
        return (
          <View style={styles.overlay}>
            <View style={styles.instructionsBox}>
              <Text style={styles.title}>💾 Saving Scan...</Text>
              <Text style={styles.subtitle}>
                {capturedImages.length} images captured
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {renderContent()}

        {/* Recent captured image previews */}
        {previewUrls.length > 0 && (
          <View style={styles.previewContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previewScroll}
            >
              {previewUrls.map((url, index) => (
                <View key={index} style={styles.previewImageContainer}>
                  <Image
                    source={{ uri: url }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#00d4ff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayFull: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    height: "100%",
  },
  topInfo: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(160, 160, 160, 1)",
    lineHeight: 20,
  },
  pitchText: {
    fontSize: 14,
    color: "rgba(160, 160, 160, 1)",
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#fbbf24",
    marginTop: 8,
    fontWeight: "600",
  },
  centerRing: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
  },
  percentageText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
  },
  segmentText: {
    fontSize: 14,
    color: "rgba(160, 160, 160, 1)",
    marginTop: 4,
  },
  bottomInfo: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  progressText: {
    fontSize: 14,
    color: "rgba(160, 160, 160, 1)",
    fontWeight: "500",
  },
  previewContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  previewScroll: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  previewImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  instructionsBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    margin: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(160, 160, 160, 1)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  startButton: {
    backgroundColor: "#00d4ff",
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#00d4ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 16,
  },
  statusText: {
    marginTop: 12,
    color: "rgba(160, 160, 160, 1)",
    fontSize: 14,
    textAlign: "center",
  },
  roomPlanControls: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  roomPlanControlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  roomPlanControlText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  messageOverlay: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 1000,
  },
  messageBox: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  messageBoxInfo: {
    backgroundColor: "rgba(0, 212, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  messageBoxError: {
    backgroundColor: "rgba(251, 191, 36, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  messageText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
});
