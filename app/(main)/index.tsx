import { useCallback, useRef, useState, useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { getMonth, parseISO } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DayView } from "../../src/components/calendar/DayView";
import { MonthView } from "../../src/components/calendar/MonthView";
import { ScheduleView } from "../../src/components/calendar/ScheduleView";
import { WeekView } from "../../src/components/calendar/WeekView";
import { YearView } from "../../src/components/calendar/YearView";
import { FloatingMenu } from "../../src/components/common/FloatingMenu";
import { FloatingNavBar } from "../../src/components/common/FloatingNavBar";
import { ViewTabBar } from "../../src/components/common/ViewTabBar";
import { useViewStore } from "../../src/stores/eventStore";
import { useTheme } from "../../src/stores/themeStore";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ZOOM_TIMING = {
  duration: 300,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

// 年视图网格参数
const YEAR_HEADER_HEIGHT = 38;
const YEAR_PANEL_BOTTOM = 100;

export default function MainScreen() {
  const { theme } = useTheme();
  const {
    currentView,
    setCurrentView,
    transitionState,
    selectedDate,
    yearCellLayouts,
  } = useViewStore();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"calendar" | "todo">("calendar");
  const [menuVisible, setMenuVisible] = useState(false);
  const prevViewRef = useRef(currentView);

  // 内容区域布局
  const contentLayout = useRef({ x: 0, y: 0, width: SCREEN_WIDTH, height: 0 });

  // 月层缩放动画（独立于年层）
  const monthZoomScale = useSharedValue(1);
  const monthZoomOriginX = useSharedValue(0);
  const monthZoomOriginY = useSharedValue(0);

  // 年层缩放动画（独立于月层）
  const yearZoomScale = useSharedValue(1);
  const yearZoomOriginX = useSharedValue(0);
  const yearZoomOriginY = useSharedValue(0);

  // 每层的透明度
  const monthOpacity = useSharedValue(1);
  const yearOpacity = useSharedValue(0);

  const handleContentLayout = useCallback((e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    contentLayout.current = { x, y, width, height };
  }, []);

  useEffect(() => {
    const prev = prevViewRef.current;
    const curr = currentView;

    if (prev === curr) return;

    cancelAnimation(monthZoomScale);
    cancelAnimation(yearZoomScale);
    cancelAnimation(monthOpacity);
    cancelAnimation(yearOpacity);

    const fromMonth = prev === "month";
    const toYear = curr === "year";
    const fromYear = prev === "year";
    const toMonth = curr === "month";

    if (fromMonth && toYear) {
      const cl = contentLayout.current;
      const month = getMonth(parseISO(selectedDate));
      const storedLayout = yearCellLayouts[month];

      if (storedLayout) {
        const { x: pageX, y: pageY, width, height } = storedLayout;
        const cellCenterX = pageX + width / 2 - cl.x;
        const cellCenterY = pageY + height / 2 - cl.y;
        const cellScale = width / cl.width;

        // 月层：从满屏向格子中心收敛
        monthZoomOriginX.value = cellCenterX;
        monthZoomOriginY.value = cellCenterY;
        // monthZoomScale.value = 1;
        //  monthOpacity.value = 1;
        //  monthZoomScale.value = withTiming(cellScale, ZOOM_TIMING);
        //  monthOpacity.value = withTiming(0, { duration: 250 });
        // 月层：直接隐藏，不做动画
        monthZoomScale.value = cellScale;
        monthOpacity.value = 0;

        // 年层：从格子位置展开到满屏
        yearZoomOriginX.value = cellCenterX;
        yearZoomOriginY.value = cellCenterY;
        yearZoomScale.value = 1 / cellScale;
        yearOpacity.value = 0;
        yearZoomScale.value = withTiming(1, ZOOM_TIMING);
        yearOpacity.value = withTiming(1, { duration: 300 });
      } else {
        const col = month % 3;
        const row = Math.floor(month / 3);
        const cellWidth = cl.width / 3;
        const gridHeight =
          cl.height - insets.top - YEAR_HEADER_HEIGHT - YEAR_PANEL_BOTTOM;
        const cellHeight = gridHeight / 4;
        const cellCenterX = (col + 0.5) * cellWidth;
        const cellCenterY =
          insets.top + YEAR_HEADER_HEIGHT + (row + 0.5) * cellHeight;

        monthZoomOriginX.value = cellCenterX;
        monthZoomOriginY.value = cellCenterY;
        // monthZoomScale.value = 1;
        // monthOpacity.value = 1;
        // monthZoomScale.value = withTiming(1 / 3, ZOOM_TIMING);
        // monthOpacity.value = withTiming(0, { duration: 250 });
        monthZoomScale.value = 1 / 3;
        monthOpacity.value = 0;

        yearZoomOriginX.value = cellCenterX;
        yearZoomOriginY.value = cellCenterY;
        yearZoomScale.value = 3;
        yearOpacity.value = 0;
        yearZoomScale.value = withTiming(1, ZOOM_TIMING);
        yearOpacity.value = withTiming(1, { duration: 300 });
      }
    } else if (fromYear && toMonth && transitionState.sourceLayout) {
      // 年→月：年面板直接消失，月视图从格子位置展开
      const {
        x: pageX,
        y: pageY,
        width,
        height,
      } = transitionState.sourceLayout;
      const cl = contentLayout.current;
      const cellCenterX = pageX + width / 2 - cl.x;
      const cellCenterY = pageY + height / 2 - cl.y;
      const cellScale = width / cl.width;

      // 年层：仅 fade out（无缩放动画）
      // yearZoomScale.value = 1;
      // yearOpacity.value = 1;
      // yearOpacity.value = withTiming(0, { duration: 200 });
      yearZoomScale.value = 1;
      yearOpacity.value = 0;

      // 月层：从格子位置展开到满屏
      monthZoomOriginX.value = cellCenterX;
      monthZoomOriginY.value = cellCenterY;
      monthZoomScale.value = cellScale;
      monthOpacity.value = 0;
      monthZoomScale.value = withTiming(1, ZOOM_TIMING);
      monthOpacity.value = withTiming(1, { duration: 300 });
    } else if (curr === "year") {
      monthZoomScale.value = 1;
      monthOpacity.value = 0;
      yearZoomScale.value = 1;
      yearOpacity.value = 1;
    } else if (curr === "month") {
      yearZoomScale.value = 1;
      yearOpacity.value = 0;
      monthZoomScale.value = 1;
      monthOpacity.value = 1;
    } else {
      monthZoomScale.value = 1;
      yearZoomScale.value = 1;
      monthOpacity.value = 0;
      yearOpacity.value = 0;
    }

    prevViewRef.current = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, transitionState]);

  // 月层缩放变换
  const monthZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: monthZoomOriginX.value },
      { translateY: monthZoomOriginY.value },
      { scale: monthZoomScale.value },
      { translateX: -monthZoomOriginX.value },
      { translateY: -monthZoomOriginY.value },
    ],
  }));

  // 年层缩放变换
  const yearZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: yearZoomOriginX.value },
      { translateY: yearZoomOriginY.value },
      { scale: yearZoomScale.value },
      { translateX: -yearZoomOriginX.value },
      { translateY: -yearZoomOriginY.value },
    ],
  }));

  const monthLayerStyle = useAnimatedStyle(() => ({
    opacity: monthOpacity.value,
  }));

  const yearLayerStyle = useAnimatedStyle(() => ({
    opacity: yearOpacity.value,
  }));

  const handleMenuPress = () => setMenuVisible(!menuVisible);
  const handleAddPress = () => {};
  const handleTabChange = (tab: "calendar" | "todo") => {
    setActiveTab(tab);
    setCurrentView(tab === "calendar" ? "month" : "events");
  };
  const handleWeekView = () => {
    setCurrentView("week");
    setActiveTab("calendar");
  };
  const handleScheduleView = () => {
    setCurrentView("events");
    setActiveTab("calendar");
  };

  const showCalendarLayers = currentView === "year" || currentView === "month";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ViewTabBar />

      {showCalendarLayers ? (
        <View style={styles.contentArea} onLayout={handleContentLayout}>
          {/* 年视图层（底层） */}
          <Animated.View
            style={[styles.layer, yearLayerStyle, yearZoomStyle]}
            pointerEvents={currentView === "year" ? "auto" : "none"}
          >
            <YearView />
          </Animated.View>

          {/* 月视图层（顶层） */}
          <Animated.View
            style={[styles.layer, monthLayerStyle, monthZoomStyle]}
            pointerEvents={currentView === "month" ? "auto" : "none"}
          >
            <MonthView />
          </Animated.View>
        </View>
      ) : (
        <View style={styles.content}>
          {currentView === "day" && <DayView />}
          {currentView === "week" && <WeekView />}
          {currentView === "events" && <ScheduleView />}
        </View>
      )}

      <FloatingNavBar
        onMenuPress={handleMenuPress}
        onAddPress={handleAddPress}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        menuOpen={menuVisible}
      />
      <FloatingMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onWeekView={handleWeekView}
        onScheduleView={handleScheduleView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
