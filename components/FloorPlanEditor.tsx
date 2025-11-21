import { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import {
  DEFAULT_LAYOUT_BOUNDS,
  LayoutBounds,
  LayoutItem,
} from "@/utils/layoutPlanner";

type Props = {
  items: LayoutItem[];
  bounds?: LayoutBounds;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

const GRID_STEP = 6; // feet

export function FloorPlanEditor({
  items,
  bounds = DEFAULT_LAYOUT_BOUNDS,
  selectedId,
  onSelect,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();

  const view = useMemo(() => {
    const horizontalPadding = 24;
    const canvasWidth = Math.max(320, windowWidth - horizontalPadding * 2);
    const scale = canvasWidth / bounds.width;
    const canvasHeight = bounds.height * scale;
    return { canvasWidth, canvasHeight, scale };
  }, [windowWidth, bounds.height, bounds.width]);

  const gridLines = useMemo(() => {
    const lines = [];
    for (let x = GRID_STEP; x < bounds.width; x += GRID_STEP) {
      lines.push(
        <Line
          key={`v-${x}`}
          x1={x * view.scale}
          y1={0}
          x2={x * view.scale}
          y2={view.canvasHeight}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      );
    }
    for (let y = GRID_STEP; y < bounds.height; y += GRID_STEP) {
      lines.push(
        <Line
          key={`h-${y}`}
          x1={0}
          y1={y * view.scale}
          x2={view.canvasWidth}
          y2={y * view.scale}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      );
    }
    return lines;
  }, [bounds.height, bounds.width, view.canvasHeight, view.canvasWidth, view.scale]);

  return (
    <View style={styles.wrapper}>
      <Svg
        width={view.canvasWidth}
        height={view.canvasHeight}
        style={styles.svg}
      >
        {gridLines}

        {items.map((item) => {
          const x = item.x * view.scale;
          const y = item.y * view.scale;
          const width = item.width * view.scale;
          const height = item.height * view.scale;

          const color =
            item.color ??
            (item.type === "machine"
              ? "#4c8dff"
              : item.type === "storage"
                ? "#facc15"
                : item.type === "aisle"
                  ? "#0ea5e9"
                  : "#22c55e");

          const isSelected = item.id === selectedId;

          return (
            <Rect
              key={item.id}
              x={x}
              y={y}
              width={width}
              height={height}
              rx={6}
              ry={6}
              fill={color}
              opacity={0.9}
              stroke={isSelected ? "#fcd34d" : "rgba(255,255,255,0.5)"}
              strokeWidth={isSelected ? 3 : 1}
              onPress={() => onSelect?.(item.id)}
            />
          );
        })}

        {items.map((item) => {
          const x = item.x * view.scale;
          const y = item.y * view.scale;
          return (
            <SvgText
              key={`${item.id}-label`}
              x={x + 6}
              y={y + 14}
              fill="#0b0f24"
              fontSize={12}
              fontWeight="bold"
            >
              {item.name}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  svg: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
