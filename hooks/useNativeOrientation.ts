import { useState, useEffect, useRef } from "react";
import { Accelerometer, Magnetometer } from "expo-sensors";

export interface OrientationData {
  alpha: number | null; // Compass heading (0-360)
  beta: number | null; // Pitch (-180 to 180)
  gamma: number | null; // Roll (-90 to 90)
  absolute: boolean;
}

export function useNativeOrientation() {
  const [orientation, setOrientation] = useState<OrientationData>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: true,
  });
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt">(
    "prompt"
  );
  const [error, setError] = useState<string | null>(null);

  const accelerometerSubscription = useRef<any>(null);
  const magnetometerSubscription = useRef<any>(null);
  const lastLoggedOrientationRef = useRef<OrientationData | null>(null);
  const lastLogTimeRef = useRef(0);

  // Only log orientation changes when movement exceeds this many degrees
  const SIGNIFICANT_MOVEMENT_DEGREES = 5;

  const calculateOrientation = (
    accel: { x: number; y: number; z: number } | null,
    mag: { x: number; y: number; z: number } | null
  ): OrientationData => {
    if (!accel) {
      return { alpha: null, beta: null, gamma: null, absolute: true };
    }

    // Calculate pitch (beta) and roll (gamma) from accelerometer
    // beta: device pitch (tilting forward/backward)
    // gamma: device roll (tilting left/right)

    // For pitch: when phone is upright (portrait), y-axis points up
    // When tilting up to ceiling, z becomes more negative, y becomes less positive
    // When tilting down to floor, z becomes more positive, y becomes more positive
    const pitch = Math.atan2(-accel.y, accel.z);
    const roll = Math.atan2(accel.x, accel.z);

    // Convert to degrees
    // For beta: 0° = upright, 90° = tilted up (ceiling), -90° = tilted down
    // Adjust so: 0° = upright, 90° = ceiling, 45° = floor
    let beta = pitch * (180 / Math.PI);

    // Normalize beta to 0-180 range where:
    // 0° = phone flat on back, 90° = upright, 180° = phone face down
    beta = 90 - beta;

    const gamma = roll * (180 / Math.PI); // -90 to 90

    let alpha: number | null = null;

    // Calculate compass heading (alpha) from magnetometer if available
    if (mag) {
      // Compensate for device tilt
      const cosRoll = Math.cos(roll);
      const sinRoll = Math.sin(roll);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      // Tilt-compensated magnetic field
      const magX = mag.x * cosPitch + mag.z * sinPitch;
      const magY =
        mag.x * sinRoll * sinPitch +
        mag.y * cosRoll -
        mag.z * sinRoll * cosPitch;

      // Calculate heading (azimuth)
      let heading = Math.atan2(-magY, magX) * (180 / Math.PI);

      // Normalize to 0-360
      if (heading < 0) {
        heading += 360;
      }

      alpha = heading;
    }

    return { alpha, beta, gamma, absolute: true };
  };

  const shouldLog = (newOrientation: OrientationData): boolean => {
    const now = Date.now();
    const lastLogged = lastLoggedOrientationRef.current;

    if (!lastLogged || now - lastLogTimeRef.current > 1000) {
      return true;
    }

    const deltaAlpha =
      lastLogged.alpha == null || newOrientation.alpha == null
        ? 0
        : Math.abs(newOrientation.alpha - lastLogged.alpha);
    const deltaBeta =
      lastLogged.beta == null || newOrientation.beta == null
        ? 0
        : Math.abs(newOrientation.beta - lastLogged.beta);
    const deltaGamma =
      lastLogged.gamma == null || newOrientation.gamma == null
        ? 0
        : Math.abs(newOrientation.gamma - lastLogged.gamma);

    return (
      deltaAlpha >= SIGNIFICANT_MOVEMENT_DEGREES ||
      deltaBeta >= SIGNIFICANT_MOVEMENT_DEGREES ||
      deltaGamma >= SIGNIFICANT_MOVEMENT_DEGREES
    );
  };

  const startListening = async () => {
    try {
      let accelData: { x: number; y: number; z: number } | null = null;
      let magData: { x: number; y: number; z: number } | null = null;

      // Set update intervals (in milliseconds)
      Accelerometer.setUpdateInterval(100); // 10 Hz
      Magnetometer.setUpdateInterval(100);

      // Subscribe to accelerometer
      accelerometerSubscription.current = Accelerometer.addListener((data) => {
        accelData = data;
        const newOrientation = calculateOrientation(accelData, magData);

        if (shouldLog(newOrientation)) {
          lastLoggedOrientationRef.current = newOrientation;
          lastLogTimeRef.current = Date.now();
          // console.log('Orientation update:', newOrientation);
        }

        setOrientation(newOrientation);
      });

      // Subscribe to magnetometer for compass heading
      magnetometerSubscription.current = Magnetometer.addListener((data) => {
        magData = data;
        const newOrientation = calculateOrientation(accelData, magData);
        setOrientation(newOrientation);
      });

      console.log("Started orientation listeners");
    } catch (err) {
      console.error("Failed to start orientation listeners:", err);
      setError(`Failed to start sensors: ${String(err)}`);
      throw err;
    }
  };

  const stopListening = () => {
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }
    if (magnetometerSubscription.current) {
      magnetometerSubscription.current.remove();
      magnetometerSubscription.current = null;
    }
    console.log("Stopped orientation listeners");
  };

  const requestPermission = async () => {
    try {
      console.log("Requesting device orientation permission...");

      // Expo automatically handles permissions for sensors
      // Just try to start listening
      await startListening();
      setPermission("granted");
      console.log("Permission granted");
    } catch (err) {
      console.error("Failed to request permission:", err);
      setError(`Failed to request permission: ${String(err)}`);
      setPermission("denied");
    }
  };

  useEffect(() => {
    // Auto-request permission on mount
    requestPermission();

    return () => {
      stopListening();
    };
  }, []);

  return {
    orientation,
    permission,
    error,
    requestPermission,
    stopListening,
  };
}
