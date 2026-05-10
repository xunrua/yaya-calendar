import { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
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

export default function MainScreen() {
  const { theme } = useTheme();
  const { currentView, setCurrentView, transitionState } = useViewStore();
  const [activeTab, setActiveTab] = useState<"calendar" | "todo">("calendar");
  const [menuVisible, setMenuVisible] = useState(false);
  const prevViewRef = useRef(currentView);

  // 缩放动画值
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const fromYear = prevViewRef.current === "year";
    const toMonth = currentView === "month";
    const fromMonth = prevViewRef.current === "month";
    const toYear = currentView === "year";

    if (fromYear && toMonth && transitionState.sourceLayout) {
      // 年→月：从小格子放大到全屏
      const { x, y, width, height } = transitionState.sourceLayout;
      const targetScale = width / SCREEN_WIDTH;
      const targetX = x + width / 2 - SCREEN_WIDTH / 2;
      const targetY = y + height / 2 - SCREEN_HEIGHT / 2;

      // 先设置到格子位置
      scale.value = targetScale;
      translateX.value = targetX;
      translateY.value = targetY;

      // 动画到全屏（不用弹簧，用 timing）
      scale.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
      translateX.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    } else if (fromMonth && toYear) {
      // 月→年：从全屏缩小淡出，年视图淡入
      // 这里不需要位置动画，只做简单的淡出效果
      scale.value = withTiming(0.9, { duration: 200, easing: Easing.in(Easing.ease) });
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });

      // 然后恢复
      setTimeout(() => {
        scale.value = withTiming(1, { duration: 150 });
      }, 200);
    } else {
      // 其他情况重置
      scale.value = withTiming(1, { duration: 200 });
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    }

    prevViewRef.current = currentView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, transitionState]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleMenuPress = () => setMenuVisible(!menuVisible);
  const handleAddPress = () => {};
  const handleTabChange = (tab: "calendar" | "todo") => {
    setActiveTab(tab);
    setCurrentView(tab === "calendar" ? "month" : "events");
  };
  const handleWeekView = () => { setCurrentView("week"); setActiveTab("calendar"); };
  const handleScheduleView = () => { setCurrentView("events"); setActiveTab("calendar"); };

  const renderViewContent = () => {
    switch (currentView) {
      case "year": return <YearView />;
      case "month": return <MonthView />;
      case "day": return <DayView />;
      case "week": return <WeekView />;
      case "events": return <ScheduleView />;
      default: return <MonthView />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ViewTabBar />
      <Animated.View style={[styles.content, animatedStyle]}>
        {renderViewContent()}
      </Animated.View>
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
  content: {
    flex: 1,
  },
});