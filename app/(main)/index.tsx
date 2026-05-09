import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { getMonth, isSameMonth, parseISO, startOfMonth } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DayView } from "@/src/components/calendar/DayView";
import { MonthView } from "@/src/components/calendar/MonthView";
import { ScheduleView } from "@/src/components/calendar/ScheduleView";
import { WeekView } from "@/src/components/calendar/WeekView";
import { YearView } from "@/src/components/calendar/YearView";
import { FloatingMenu } from "@/src/components/common/FloatingMenu";
import { FloatingNavBar } from "@/src/components/common/FloatingNavBar";
import { CalendarHeader } from "@/src/components/common/CalendarHeader";
import { DebugOverlay } from "@/src/components/common/DebugOverlay";
import { useViewStore } from "@/src/stores/eventStore";
import { useTheme } from "@/src/stores/themeStore";
import type { ViewType } from "@/src/domain/types";

type NavTab = "year" | "calendar" | "todo";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ANIM_DURATION = 800;

const ZOOM_TIMING = {
  duration: ANIM_DURATION,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

const YEAR_HEADER_HEIGHT = 38;
const YEAR_PANEL_BOTTOM = 100;

export default function MainScreen() {
  const { theme } = useTheme();
  const {
    currentView,
    setCurrentView,
    transitionState,
    setTransitionState,
    selectedDate,
    yearCellLayouts,
    displayMonth,
    goToToday,
  } = useViewStore();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const prevViewRef = useRef(currentView);

  // 计算是否显示"今"按钮
  const showTodayButton = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentDisplayMonth = startOfMonth(new Date(displayMonth));
    const todayMonth = startOfMonth(today);

    return selectedDate !== todayStr || !isSameMonth(currentDisplayMonth, todayMonth);
  }, [selectedDate, displayMonth]);

  const contentLayout = useRef({ x: 0, y: 0, width: SCREEN_WIDTH, height: 0 });

  // ── Shared values ──────────────────────────────────────────────────────────
  // ⚠️ origin 存的是「格子中心 相对于 内容区中心」的偏移量
  //    即：dx = cellCenterX - contentWidth/2
  //        dy = cellCenterY - contentHeight/2
  const monthZoomScale = useSharedValue(1);
  const monthZoomOriginX = useSharedValue(0); // dx from center
  const monthZoomOriginY = useSharedValue(0); // dy from center

  const yearZoomScale = useSharedValue(1);
  const yearZoomOriginX = useSharedValue(0);
  const yearZoomOriginY = useSharedValue(0);

  const monthOpacity = useSharedValue(1);
  const yearOpacity = useSharedValue(0);

  const lastCellCXRef = useRef(0);
  const lastCellCYRef = useRef(0);

  // ── Layout ─────────────────────────────────────────────────────────────────
  const handleContentLayout = useCallback((e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    contentLayout.current = { x, y, width, height };
  }, []);

  // ── 核心：计算 origin（偏移量），并驱动动画 ─────────────────────────────────
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

    /**
     * 将「格子的绝对坐标」换算成「相对于内容区中心的偏移量」
     * transform: [tx(dx), ty(dy), scale(s), tx(-dx), ty(-dy)]
     * 等价于以 (contentCX + dx, contentCY + dy) 为锚点缩放
     */
    const toDelta = (cellCenterX: number, cellCenterY: number) => {
      const cl = contentLayout.current;
      return {
        dx: cellCenterX - cl.width / 2,
        dy: cellCenterY - cl.height / 2,
      };
    };

    if (fromMonth && toYear) {
      const cl = contentLayout.current;
      const month = getMonth(parseISO(selectedDate));
      const storedLayout = yearCellLayouts[month];

      let cellCenterX: number;
      let cellCenterY: number;
      let cellScale: number;

      if (storedLayout) {
        const { x: pageX, y: pageY, width, height } = storedLayout;
        cellCenterX = pageX + width / 2 - cl.x;
        cellCenterY = pageY + height / 2 - cl.y;
        cellScale = width / cl.width;
      } else {
        // fallback：用网格估算
        const col = month % 3;
        const row = Math.floor(month / 3);
        const cellWidth = cl.width / 3;
        const gridH =
          cl.height - insets.top - YEAR_HEADER_HEIGHT - YEAR_PANEL_BOTTOM;
        const cellH = gridH / 4;
        cellCenterX = (col + 0.5) * cellWidth;
        cellCenterY = insets.top + YEAR_HEADER_HEIGHT + (row + 0.5) * cellH;
        cellScale = 1 / 3;
      }

      lastCellCXRef.current = cellCenterX;
      lastCellCYRef.current = cellCenterY;

      const { dx, dy } = toDelta(cellCenterX, cellCenterY);

      // 月层：直接跳到收缩态（隐藏）
      monthZoomOriginX.value = dx;
      monthZoomOriginY.value = dy;
      monthZoomScale.value = cellScale;
      monthOpacity.value = 0;

      // 年层：从格子位置放大到满屏
      yearZoomOriginX.value = dx;
      yearZoomOriginY.value = dy;
      yearZoomScale.value = 1 / cellScale; // 起点：和格子等大
      yearOpacity.value = 0;
      yearZoomScale.value = withTiming(1, ZOOM_TIMING);
      yearOpacity.value = withTiming(1, { duration: ANIM_DURATION });
    } else if (fromYear && toMonth && transitionState.sourceLayout) {
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

      lastCellCXRef.current = cellCenterX;
      lastCellCYRef.current = cellCenterY;

      const { dx, dy } = toDelta(cellCenterX, cellCenterY);

      // 年层：直接消失
      yearZoomScale.value = 1;
      yearOpacity.value = 0;

      // 月层：从格子位置展开到满屏
      monthZoomOriginX.value = dx;
      monthZoomOriginY.value = dy;
      monthZoomScale.value = cellScale; // 起点：和格子等大
      monthOpacity.value = 0;
      monthZoomScale.value = withTiming(1, ZOOM_TIMING);
      monthOpacity.value = withTiming(1, { duration: ANIM_DURATION });
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

  // ── Animated styles ────────────────────────────────────────────────────────
  // 三明治公式：translate(dx,dy) → scale → translate(-dx,-dy)
  // 效果：以「内容区中心 + (dx,dy)」为锚点缩放
  const monthZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: monthZoomOriginX.value },
      { translateY: monthZoomOriginY.value },
      { scale: monthZoomScale.value },
      { translateX: -monthZoomOriginX.value },
      { translateY: -monthZoomOriginY.value },
    ],
  }));

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

  // ── Handlers ───────────────────────────────────────────────────────────────
  const VIEW_FROM_TAB: Record<NavTab, ViewType> = {
    year: "year",
    calendar: "month",
    todo: "events",
  };

  const activeTab: NavTab =
    currentView === "year"
      ? "year"
      : currentView === "events"
        ? "todo"
        : "calendar";

  /** 月→年切换前，设置过渡动画的起始位置 */
  const prepareYearTransition = useCallback(() => {
    if (currentView !== "month") return;

    const month = getMonth(parseISO(selectedDate));
    const storedLayout = yearCellLayouts[month];
    if (storedLayout) {
      setTransitionState({ sourceLayout: storedLayout });
      return;
    }

    const col = month % 3;
    const row = Math.floor(month / 3);
    const cellWidth = SCREEN_WIDTH / 3;
    setTransitionState({
      sourceLayout: {
        x: col * cellWidth,
        y: insets.top + row * 185,
        width: cellWidth,
        height: 185,
      },
    });
  }, [
    currentView,
    selectedDate,
    yearCellLayouts,
    insets.top,
    setTransitionState,
  ]);

  const handleMenuPress = () => setMenuVisible(!menuVisible);
  const handleAddPress = () => {};

  const handleTabChange = (tab: NavTab) => {
    if (tab === "year") prepareYearTransition();
    setCurrentView(VIEW_FROM_TAB[tab]);
  };

  const handleWeekView = () => setCurrentView("week");
  const handleScheduleView = () => setCurrentView("events");

  const showCalendarLayers = currentView === "year" || currentView === "month";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {showCalendarLayers && <CalendarHeader />}

      {showCalendarLayers ? (
        <View style={styles.contentArea} onLayout={handleContentLayout}>
          <Animated.View
            style={[styles.layer, yearLayerStyle, yearZoomStyle]}
            pointerEvents={currentView === "year" ? "auto" : "none"}
          >
            <YearView />
          </Animated.View>

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
        onTodayPress={goToToday}
        showTodayButton={showTodayButton}
      />
      <FloatingMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onWeekView={handleWeekView}
        onScheduleView={handleScheduleView}
      />
      <DebugOverlay
        monthZoomScale={monthZoomScale}
        monthZoomOriginX={monthZoomOriginX}
        monthZoomOriginY={monthZoomOriginY}
        monthOpacity={monthOpacity}
        yearZoomScale={yearZoomScale}
        yearZoomOriginX={yearZoomOriginX}
        yearZoomOriginY={yearZoomOriginY}
        yearOpacity={yearOpacity}
        contentLayout={contentLayout}
        lastCellCXRef={lastCellCXRef}
        lastCellCYRef={lastCellCYRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentArea: { flex: 1, position: "relative", overflow: "hidden" },
  content: { flex: 1 },
  layer: { ...StyleSheet.absoluteFillObject },
});
