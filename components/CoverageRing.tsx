import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface CoverageRingProps {
  coveredSegments: Set<number>;
  totalSegments?: number;
}

export function CoverageRing({ coveredSegments, totalSegments = 24 }: CoverageRingProps) {
  const segments = Array.from({ length: totalSegments }, (_, i) => i);
  const segmentAngle = 360 / totalSegments;
  const radius = 140;
  const strokeWidth = 20;

  const renderSegments = () => {
    return segments.map((segment) => {
      const isCovered = coveredSegments.has(segment);
      const startAngle = segment * segmentAngle;
      const endAngle = (segment + 1) * segmentAngle;

      // Convert to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate path
      const centerX = 160;
      const centerY = 160;
      const innerRadius = radius - strokeWidth / 2;
      const outerRadius = radius + strokeWidth / 2;

      const x1 = centerX + innerRadius * Math.cos(startRad);
      const y1 = centerY + innerRadius * Math.sin(startRad);
      const x2 = centerX + outerRadius * Math.cos(startRad);
      const y2 = centerY + outerRadius * Math.sin(startRad);
      const x3 = centerX + outerRadius * Math.cos(endRad);
      const y3 = centerY + outerRadius * Math.sin(endRad);
      const x4 = centerX + innerRadius * Math.cos(endRad);
      const y4 = centerY + innerRadius * Math.sin(endRad);

      const largeArcFlag = segmentAngle > 180 ? 1 : 0;

      const pathData = `
        M ${x1} ${y1}
        L ${x2} ${y2}
        A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
        L ${x4} ${y4}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
        Z
      `;

      return (
        <Path
          key={segment}
          d={pathData}
          fill={isCovered ? 'rgba(34, 197, 94, 0.8)' : 'rgba(255, 255, 255, 0.05)'}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg width={320} height={320} viewBox="0 0 320 320" style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx="160"
          cy="160"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Coverage segments */}
        {renderSegments()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
});
