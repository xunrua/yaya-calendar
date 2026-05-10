import { useCallback, useRef, useState, useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
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
const SCREEN_HEIGHT = Dimensions.get("window").height;

const ZOOM_OUT_TIMING = {
  duration: 300,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
};

export default function MainScreen() {
  const { theme } = useTheme();
  const { currentView, setCurrentView, transitionState } = useViewStore();
  const [activeTab, setActiveTab] = useState<"calendar" | "todo">("calendar");
  const [menuVisible, setMenuVisible] = useState(false);
  const prevViewRef = useRef(currentView);

  // Content area layout (position + dimensions, set via onLayout)
  const contentLayout = useRef({ x: 0, y: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  // Zoom animation shared values — applied to the INCOMING view
  const zoomScale = useSharedValue(1);
  const zoomTranslateX = useSharedValue(0);
  const zoomTranslateY = useSharedValue(0);

  // Opacity for each layer
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

    // Cancel any ongoing animations to handle rapid switching
    cancelAnimation(zoomScale);
    cancelAnimation(zoomTranslateX);
    cancelAnimation(zoomTranslateY);
    cancelAnimation(monthOpacity);
    cancelAnimation(yearOpacity);

    const fromMonth = prev === "month";
    const toYear = curr === "year";
    const fromYear = prev === "year";
    const toMonth = curr === "month";

    if (fromMonth && toYear && transitionState.sourceLayout) {
      // Month → Year: month instantly hidden, year zooms OUT from current month position
      monthOpacity.value = 0;

      const { x, y, width, height } = transitionState.sourceLayout;
      const cl = contentLayout.current;

      // Year view starts zoomed IN so the current month cell fills the content area
      const initialScale = cl.width / width;
      const cellCenterX = x + width / 2;
      const cellCenterY = y + height / 2;
      const contentCenterX = cl.width / 2;
      const contentCenterY = cl.height / 2;

      const initialTX = contentCenterX - cellCenterX * initialScale;
      const initialTY = contentCenterY - cellCenterY * initialScale;

      // Set initial state (no animation)
      zoomScale.value = initialScale;
      zoomTranslateX.value = initialTX;
      zoomTranslateY.value = initialTY;
      yearOpacity.value = 0;

      // Animate year view to normal size + fade in
      zoomScale.value = withTiming(1, ZOOM_OUT_TIMING);
      zoomTranslateX.value = withTiming(0, ZOOM_OUT_TIMING);
      zoomTranslateY.value = withTiming(0, ZOOM_OUT_TIMING);
      yearOpacity.value = withTiming(1, { duration: 300 });
    } else if (fromYear && toMonth && transitionState.sourceLayout) {
      // Year → Month: year instantly hidden, month zooms IN from clicked cell position
      yearOpacity.value = 0;

      const { x: pageX, y: pageY, width, height } = transitionState.sourceLayout;
      const cl = contentLayout.current;

      // sourceLayout has screen-absolute coords from ref.measure(); convert to content-area-relative
      const cellCenterX = pageX + width / 2 - cl.x;
      const cellCenterY = pageY + height / 2 - cl.y;
      const contentCenterX = cl.width / 2;
      const contentCenterY = cl.height / 2;
      const initialScale = width / cl.width;
      const initialTX = cellCenterX - contentCenterX * initialScale;
      const initialTY = cellCenterY - contentCenterY * initialScale;

      // Set initial state
      zoomScale.value = initialScale;
      zoomTranslateX.value = initialTX;
      zoomTranslateY.value = initialTY;
      monthOpacity.value = 0;

      // Animate month view to full size + fade in
      zoomScale.value = withTiming(1, ZOOM_OUT_TIMING);
      zoomTranslateX.value = withTiming(0, ZOOM_OUT_TIMING);
      zoomTranslateY.value = withTiming(0, ZOOM_OUT_TIMING);
      monthOpacity.value = withTiming(1, { duration: 300 });
    } else if (curr === "year") {
      // Direct navigation to year view
      monthOpacity.value = 0;
      yearOpacity.value = 1;
      zoomScale.value = 1;
      zoomTranslateX.value = 0;
      zoomTranslateY.value = 0;
    } else if (curr === "month") {
      yearOpacity.value = 0;
      monthOpacity.value = 1;
      zoomScale.value = 1;
      zoomTranslateX.value = 0;
      zoomTranslateY.value = 0;
    } else {
      yearOpacity.value = 0;
      monthOpacity.value = 0;
      zoomScale.value = 1;
      zoomTranslateX.value = 0;
      zoomTranslateY.value = 0;
    }

    prevViewRef.current = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, transitionState]);

  // The zoom transform is applied to whichever view is appearing
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomTranslateX.value },
      { translateY: zoomTranslateY.value },
      { scale: zoomScale.value },
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
          {/* Year view layer (behind) */}
          <Animated.View
            style={[styles.layer, yearLayerStyle, zoomStyle]}
            pointerEvents={currentView === "year" ? "auto" : "none"}
          >
            <YearView />
          </Animated.View>

          {/* Month view layer (front) */}
          <Animated.View
            style={[styles.layer, monthLayerStyle, zoomStyle]}
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
  },
  content: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
