import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  amplitude: number;
  baseOpacity: number;
  pulseSpan: number;
  waveAngle: number;
  clusterId: number;
}

type Props = {
  color?: string;
  focus?: { x: number; y: number };
};

export default function ParticleWaveBackground({ color = '#1d5fbf', focus }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const clusterWaves = useMemo(
    () =>
      [
        { duration: 2400, delay: 0, scaleSpan: 0.08, opacitySpan: 0.16 },
        { duration: 3100, delay: 400, scaleSpan: 0.12, opacitySpan: 0.12 },
        { duration: 1800, delay: 200, scaleSpan: 0.06, opacitySpan: 0.18 },
        { duration: 2700, delay: 800, scaleSpan: 0.1, opacitySpan: 0.14 },
      ].map(cfg => ({
        ...cfg,
        value: new Animated.Value(0),
      })),
    []
  );

  useEffect(() => {
    clusterWaves.forEach(({ value, duration, delay }) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [clusterWaves]);

  useEffect(() => {
    const focusPoint = focus ?? { x: width / 2, y: height * 0.55 };
    const clusterRadius = Math.min(width, height) * 0.32;
    const clusters = [
      { id: 0, weight: 0.55, x: focusPoint.x, y: focusPoint.y, radius: clusterRadius },
      { id: 1, weight: 0.12, x: width * 0.12, y: height * 0.12, radius: width * 0.22 },
      { id: 2, weight: 0.12, x: width * 0.88, y: height * 0.12, radius: width * 0.22 },
      { id: 3, weight: 0.11, x: width * 0.14, y: height * 0.9, radius: width * 0.24 },
      { id: 0, weight: 0.1, x: width * 0.86, y: height * 0.86, radius: width * 0.24 },
    ];

    const chooseCluster = () => {
      const r = Math.random();
      let cumulative = 0;
      for (const c of clusters) {
        cumulative += c.weight;
        if (r <= cumulative) return c;
      }
      return clusters[0];
    };

    const particleCount = 1400;
    const generated: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const cluster = chooseCluster();
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 2) * cluster.radius;

      const x = Math.min(
        width,
        Math.max(0, cluster.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 10)
      );
      const y = Math.min(
        height,
        Math.max(0, cluster.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 14)
      );

      const focusDistance = Math.hypot(x - focusPoint.x, y - focusPoint.y);
      const focusWeight = Math.max(0, 1 - focusDistance / (clusterRadius * 1.1));

      generated.push({
        id: i,
        x,
        y,
        size: 0.8 + Math.random() * 1.8 + focusWeight * 0.6,
        amplitude: 4 + Math.random() * 6 + focusWeight * 8,
        baseOpacity: 0.35 + Math.random() * 0.35 + focusWeight * 0.25,
        pulseSpan: 0.15 + Math.random() * 0.25 + focusWeight * 0.1,
        waveAngle: Math.random() * Math.PI * 2,
        clusterId: cluster.id,
      });
    }

    setParticles(generated);
  }, [focus]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => {
        const wave = clusterWaves[particle.clusterId % clusterWaves.length];
        const translateX = wave.value.interpolate({
          inputRange: [0, 1],
          outputRange: [
            -particle.amplitude * Math.cos(particle.waveAngle),
            particle.amplitude * Math.cos(particle.waveAngle),
          ],
        });

        const translateY = wave.value.interpolate({
          inputRange: [0, 1],
          outputRange: [
            -particle.amplitude * Math.sin(particle.waveAngle),
            particle.amplitude * Math.sin(particle.waveAngle),
          ],
        });

        const opacity = wave.value.interpolate({
          inputRange: [0, 1],
          outputRange: [
            Math.max(0.05, particle.baseOpacity - particle.pulseSpan),
            Math.min(1, particle.baseOpacity + particle.pulseSpan + wave.opacitySpan / 2),
          ],
        });

        const scale = wave.value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1 + wave.scaleSpan],
        });

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                opacity,
                backgroundColor: color,
                transform: [{ translateX }, { translateY }, { scale }],
                shadowColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#1d5fbf',
    borderRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
});
