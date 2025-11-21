import { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, {
  G,
  Polygon,
  Rect,
  Text as SvgText,
  Line,
} from "react-native-svg";
import {
  DEFAULT_LAYOUT_BOUNDS,
  LayoutBounds,
  LayoutItem,
} from "@/utils/layoutPlanner";

type Props = {
  items: LayoutItem[];
  bounds?: LayoutBounds;
  selectedId?: string | null;
};

const HEIGHT_LOOKUP: Record<string, number> = {
  machine: 6,
  storage: 4,
  support: 3,
  aisle: 1,
};

export function Layout3DPreview({
  items,
  bounds = DEFAULT_LAYOUT_BOUNDS,
  selectedId,
}: Props) {
  const { width } = useWindowDimensions();

  const view = useMemo(() => {
    const padding = 20;
    const canvasWidth = Math.max(320, width - padding * 2);
    const scale = canvasWidth / bounds.width;
    const canvasHeight = (bounds.height + 40) * scale;
    return { canvasWidth, canvasHeight, scale };
  }, [bounds.height, bounds.width, width]);

  const project = (x: number, y: number, z = 0) => {
    const isoX = (x - y) * 0.7;
    const isoY = (x + y) * 0.35;
    return {
      x: isoX * view.scale + view.canvasWidth * 0.55,
      y: view.canvasHeight * 0.15 + isoY * view.scale - z * view.scale,
    };
  };

  return (
    <View style={styles.wrapper}>
      <Svg
        width={view.canvasWidth}
        height={view.canvasHeight}
        style={styles.svg}
      >
        {/* Ground plane */}
        <Rect
          x={0}
          y={view.canvasHeight * 0.2}
          width={view.canvasWidth}
          height={view.canvasHeight * 0.8}
          fill="rgba(255,255,255,0.05)"
          opacity={0.22}
        />

        {/* Grid */}
        {Array.from({ length: 10 }).map((_, idx) => {
          const offset = idx * (bounds.width / 10);
          const start = project(offset, 0);
          const end = project(offset, bounds.height);
          return (
            <Line
              key={`grid-x-${idx}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}

        {Array.from({ length: 8 }).map((_, idx) => {
          const offset = idx * (bounds.height / 8);
          const start = project(0, offset);
          const end = project(bounds.width, offset);
          return (
            <Line
              key={`grid-y-${idx}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}

        {items.map((item) => {
          const baseHeight = HEIGHT_LOOKUP[item.type] ?? 3;
          const zHeight = baseHeight * 0.6;

          const topFace = [
            project(item.x, item.y, zHeight),
            project(item.x + item.width, item.y, zHeight),
            project(item.x + item.width, item.y + item.height, zHeight),
            project(item.x, item.y + item.height, zHeight),
          ];

          const sideFace = [
            project(item.x, item.y + item.height, 0),
            project(item.x + item.width, item.y + item.height, 0),
            project(item.x + item.width, item.y + item.height, zHeight),
            project(item.x, item.y + item.height, zHeight),
          ];

          const color =
            item.color ??
            (item.type === "machine"
              ? "#4c8dff"
              : item.type === "storage"
                ? "#facc15"
                : item.type === "aisle"
                  ? "#0ea5e9"
                  : "#22c55e");

          const selected = item.id === selectedId;

          return (
            <G key={item.id}>
              <Polygon
                points={sideFace.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={color}
                opacity={selected ? 0.48 : 0.34}
                stroke={selected ? "#fcd34d" : "rgba(255,255,255,0.4)"}
                strokeWidth={selected ? 2 : 1}
              />
              <Polygon
                points={topFace.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={color}
                opacity={selected ? 0.9 : 0.72}
                stroke={selected ? "#fcd34d" : "rgba(255,255,255,0.6)"}
                strokeWidth={selected ? 2 : 1}
              />
              <SvgText
                x={topFace[0].x + 6}
                y={topFace[0].y - 6}
                fill="#0b0f24"
                fontSize={12}
                fontWeight="bold"
              >
                {item.name}
              </SvgText>
            </G>
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
