import { format, getMonth, isSameMonth, parseISO, startOfMonth } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DayView } from "@/src/components/calendar/DayView";
import { MonthView } from "@/src/components/calendar/MonthView";
import { ScheduleView } from "@/src/components/calendar/ScheduleView";
import { YearView } from "@/src/components/calendar/YearView";
import { CalendarHeader } from "@/src/components/common/CalendarHeader";
import { FloatingMenu } from "@/src/components/common/FloatingMenu";
import { FloatingNavBar } from "@/src/components/common/FloatingNavBar";
import type { ViewType } from "@/src/domain/types";
import { useViewStore } from "@/src/stores/eventStore";
import { useTheme } from "@/src/stores/themeStore";

type NavTab = "calendar" | "todo";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ANIM_DURATION = 300;

const ZOOM_TIMING = {
  duration: ANIM_DURATION,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

const YEAR_HEADER_HEIGHT = 38;
const YEAR_PANEL_BOTTOM = 100;

export default function MainScreen() {
  const { theme } = useTheme();
  const currentView = useViewStore((s) => s.currentView);
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setTransitionState = useViewStore((s) => s.setTransitionState);
  const selectedDate = useViewStore((s) => s.selectedDate);
  const setSelectedDateAndMonth = useViewStore((s) => s.setSelectedDateAndMonth);
  const displayMonth = useViewStore((s) => s.displayMonth);
  const goToToday = useViewStore((s) => s.goToToday);
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const prevViewRef = useRef(currentView);
  const setHasNavigatedMonth = useViewStore((s) => s.setHasNavigatedMonth);

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

  // ── Layout ─────────────────────────────────────────────────────────────────
  const handleContentLayout = useCallback((e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    contentLayout.current = { x, y, width, height };
  }, []);

  // ── 核心：非月/年切换时重置图层状态 ─────────────────────────────────────────
  useEffect(() => {
    const prev = prevViewRef.current;
    const curr = currentView;
    if (prev === curr) return;

    const isMonthYearTransition =
      (prev === "month" && curr === "year") || (prev === "year" && curr === "month");
    if (isMonthYearTransition) {
      prevViewRef.current = curr;
      return;
    }

    cancelAnimation(monthZoomScale);
    cancelAnimation(yearZoomScale);
    cancelAnimation(monthOpacity);
    cancelAnimation(yearOpacity);

    if (curr === "year") {
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
  }, [currentView, yearZoomScale, yearOpacity, monthZoomScale, monthOpacity]);

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
    calendar: "month",
    todo: "events",
  };

  const activeTab: NavTab = currentView === "events" ? "todo" : "calendar";

  // ── 同步动画启动（避免子组件渲染阻塞动画）────────────────────────────────
  const runMonthToYearAnimation = useCallback(() => {
    const cl = contentLayout.current;
    if (cl.width === 0) return;

    const month = getMonth(parseISO(selectedDate));
    const storedLayout = useViewStore.getState().yearCellLayouts[month];

    let cellCenterX: number;
    let cellCenterY: number;
    let cellScale: number;

    if (storedLayout) {
      const { x: pageX, y: pageY, width, height } = storedLayout;
      cellCenterX = pageX + width / 2 - cl.x;
      cellCenterY = pageY + height / 2 - cl.y;
      cellScale = width / cl.width;
    } else {
      const col = month % 3;
      const row = Math.floor(month / 3);
      const cellWidth = cl.width / 3;
      const gridH = cl.height - insets.top - YEAR_HEADER_HEIGHT - YEAR_PANEL_BOTTOM;
      const cellH = gridH / 4;
      cellCenterX = (col + 0.5) * cellWidth;
      cellCenterY = insets.top + YEAR_HEADER_HEIGHT + (row + 0.5) * cellH;
      cellScale = 1 / 3;
    }

    const dx = cellCenterX - cl.width / 2;
    const dy = cellCenterY - cl.height / 2;

    cancelAnimation(monthZoomScale);
    cancelAnimation(yearZoomScale);
    cancelAnimation(monthOpacity);
    cancelAnimation(yearOpacity);

    monthZoomOriginX.value = dx;
    monthZoomOriginY.value = dy;
    monthZoomScale.value = cellScale;
    monthOpacity.value = 0;

    yearZoomOriginX.value = dx;
    yearZoomOriginY.value = dy;
    yearZoomScale.value = 1 / cellScale;
    yearOpacity.value = 0;
    yearZoomScale.value = withTiming(1, ZOOM_TIMING);
    yearOpacity.value = withTiming(1, { duration: ANIM_DURATION });
  }, [
    selectedDate,
    insets.top,
    monthZoomScale,
    monthZoomOriginX,
    monthZoomOriginY,
    monthOpacity,
    yearZoomScale,
    yearZoomOriginX,
    yearZoomOriginY,
    yearOpacity,
  ]);

  const runYearToMonthAnimation = useCallback(
    (sourceLayout: { x: number; y: number; width: number; height: number }) => {
      const cl = contentLayout.current;
      if (cl.width === 0) return;

      const { x: pageX, y: pageY, width, height } = sourceLayout;
      const cellCenterX = pageX + width / 2 - cl.x;
      const cellCenterY = pageY + height / 2 - cl.y;
      const cellScale = width / cl.width;

      const dx = cellCenterX - cl.width / 2;
      const dy = cellCenterY - cl.height / 2;

      cancelAnimation(monthZoomScale);
      cancelAnimation(yearZoomScale);
      cancelAnimation(monthOpacity);
      cancelAnimation(yearOpacity);

      yearZoomScale.value = 1;
      yearOpacity.value = 0;

      monthZoomOriginX.value = dx;
      monthZoomOriginY.value = dy;
      monthZoomScale.value = cellScale;
      monthOpacity.value = 0;
      monthZoomScale.value = withTiming(1, ZOOM_TIMING);
      monthOpacity.value = withTiming(1, { duration: ANIM_DURATION });
    },
    [monthZoomScale, monthZoomOriginX, monthZoomOriginY, monthOpacity, yearZoomScale, yearOpacity]
  );

  const handleMonthPressFromYear = useCallback(
    (monthDate: Date, layout: { x: number; y: number; width: number; height: number }) => {
      const today = new Date();
      const newSelectedDate = isSameMonth(monthDate, today)
        ? format(today, "yyyy-MM-dd")
        : format(monthDate, "yyyy-MM-dd");

      // 1) 同步启动 zoom 动画（仅改 shared value，不触发 React render）
      runYearToMonthAnimation(layout);

      // 2) 同步更新 React state
      //    setSelectedDateAndMonth 一次性写入 selectedDate + displayMonth，
      //    配合 MonthView 内的 effect guard，整个切换只触发一轮渲染。
      setCurrentView("month");
      setSelectedDateAndMonth(newSelectedDate);
      setHasNavigatedMonth(false);
      setTransitionState({ sourceLayout: layout });
    },
    [
      setTransitionState,
      setSelectedDateAndMonth,
      setHasNavigatedMonth,
      setCurrentView,
      runYearToMonthAnimation,
    ]
  );

  /** 月→年切换前，设置过渡动画的起始位置 */
  const prepareYearTransition = useCallback(() => {
    if (currentView !== "month") return;

    const month = getMonth(parseISO(selectedDate));
    const storedLayout = useViewStore.getState().yearCellLayouts[month];
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
  }, [currentView, selectedDate, insets.top, setTransitionState]);

  const handleMenuPress = () => setMenuVisible(!menuVisible);
  const handleAddPress = () => {};

  const handleTabChange = (tab: NavTab) => {
    setCurrentView(VIEW_FROM_TAB[tab]);
  };

  const handleYearViewPress = () => {
    if (currentView !== "month") return;
    prepareYearTransition();
    runMonthToYearAnimation();
    setCurrentView("year");
  };

  const showCalendarLayers = currentView === "year" || currentView === "month";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showCalendarLayers && <CalendarHeader onYearViewPress={handleYearViewPress} />}

      {showCalendarLayers ? (
        <View style={styles.contentArea} onLayout={handleContentLayout}>
          <Animated.View
            style={[styles.layer, yearLayerStyle, yearZoomStyle]}
            pointerEvents={currentView === "year" ? "auto" : "none"}
          >
            <YearView onMonthPress={handleMonthPressFromYear} />
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
      <FloatingMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentArea: { flex: 1, position: "relative", overflow: "hidden" },
  content: { flex: 1 },
  layer: { ...StyleSheet.absoluteFillObject },
});
