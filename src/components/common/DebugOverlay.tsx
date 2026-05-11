import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { runOnJS, type SharedValue, useAnimatedReaction } from "react-native-reanimated";

type DebugState = {
  monthScale: number;
  monthOx: number;
  monthOy: number;
  monthOpacity: number;
  yearScale: number;
  yearOx: number;
  yearOy: number;
  yearOpacity: number;
  contentW: number;
  contentH: number;
  lastCellCX: number;
  lastCellCY: number;
};

type DebugOverlayProps = {
  monthZoomScale: SharedValue<number>;
  monthZoomOriginX: SharedValue<number>;
  monthZoomOriginY: SharedValue<number>;
  monthOpacity: SharedValue<number>;
  yearZoomScale: SharedValue<number>;
  yearZoomOriginX: SharedValue<number>;
  yearZoomOriginY: SharedValue<number>;
  yearOpacity: SharedValue<number>;
  contentLayout: React.MutableRefObject<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  lastCellCXRef: React.MutableRefObject<number>;
  lastCellCYRef: React.MutableRefObject<number>;
  debug?: boolean;
};

function DebugPanel({ state }: { state: DebugState }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>🔧 Debug</Text>
      <Text style={styles.row}>
        content: {state.contentW.toFixed(0)} × {state.contentH.toFixed(0)}
      </Text>
      <Text style={styles.row}>
        lastCell center: ({state.lastCellCX.toFixed(1)}, {state.lastCellCY.toFixed(1)})
      </Text>
      <Text style={[styles.row, { color: "#4af" }]}>
        [Month] scale={state.monthScale.toFixed(3)} opacity=
        {state.monthOpacity.toFixed(2)}
      </Text>
      <Text style={[styles.row, { color: "#4af" }]}>
        [Month] ox={state.monthOx.toFixed(1)} oy={state.monthOy.toFixed(1)}
      </Text>
      <Text style={[styles.row, { color: "#fa4" }]}>
        [Year] scale={state.yearScale.toFixed(3)} opacity=
        {state.yearOpacity.toFixed(2)}
      </Text>
      <Text style={[styles.row, { color: "#fa4" }]}>
        [Year] ox={state.yearOx.toFixed(1)} oy={state.yearOy.toFixed(1)}
      </Text>
    </View>
  );
}

export function DebugOverlay({
  monthZoomScale,
  monthZoomOriginX,
  monthZoomOriginY,
  monthOpacity,
  yearZoomScale,
  yearZoomOriginX,
  yearZoomOriginY,
  yearOpacity,
  contentLayout,
  lastCellCXRef,
  lastCellCYRef,
  debug = false,
}: DebugOverlayProps) {
  const [showDebug, setShowDebug] = useState(debug);
  const [debugState, setDebugState] = useState<DebugState>({
    monthScale: 1,
    monthOx: 0,
    monthOy: 0,
    monthOpacity: 1,
    yearScale: 1,
    yearOx: 0,
    yearOy: 0,
    yearOpacity: 0,
    contentW: 0,
    contentH: 0,
    lastCellCX: 0,
    lastCellCY: 0,
  });

  const updateDebug = useCallback(() => {
    setDebugState({
      monthScale: monthZoomScale.value,
      monthOx: monthZoomOriginX.value,
      monthOy: monthZoomOriginY.value,
      monthOpacity: monthOpacity.value,
      yearScale: yearZoomScale.value,
      yearOx: yearZoomOriginX.value,
      yearOy: yearZoomOriginY.value,
      yearOpacity: yearOpacity.value,
      contentW: contentLayout.current.width,
      contentH: contentLayout.current.height,
      lastCellCX: lastCellCXRef.current,
      lastCellCY: lastCellCYRef.current,
    });
  }, [
    monthZoomScale,
    monthZoomOriginX,
    monthZoomOriginY,
    monthOpacity,
    yearZoomScale,
    yearZoomOriginX,
    yearZoomOriginY,
    yearOpacity,
    contentLayout,
    lastCellCXRef,
    lastCellCYRef,
  ]);

  useAnimatedReaction(() => ({
    ms: monthZoomScale.value,
    ys: yearZoomScale.value,
    mo: monthOpacity.value,
    yo: yearOpacity.value,
  }), () => {
    if (showDebug) runOnJS(updateDebug)();
  }, [showDebug, updateDebug]);

  return (
    <>
      {showDebug && <DebugPanel state={debugState} />}
      {debug && (
        <TouchableOpacity style={styles.debugToggle} onPress={() => setShowDebug((v) => !v)}>
          <Text style={styles.debugToggleText}>{showDebug ? "隐藏调试" : "🔧"}</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 60,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 8,
    padding: 8,
    zIndex: 9999,
    minWidth: 200,
  },
  title: { color: "#fff", fontWeight: "bold", marginBottom: 4 },
  row: {
    color: "#ccc",
    fontSize: 11,
    fontFamily: "Courier",
    lineHeight: 16,
  },
  debugToggle: {
    position: "absolute",
    bottom: 120,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 10000,
  },
  debugToggleText: { color: "#fff", fontSize: 12 },
});
