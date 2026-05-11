import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import MonthGrid from "./MonthGrid";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const EXPANDED_HEIGHT = 320;
const COLLAPSED_HEIGHT = 64;
const FOLD_VELOCITY_THRESHOLD = 300;
const FOLD_DISTANCE_THRESHOLD = SCREEN_HEIGHT * 0.05;

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, displayMonth: displayMonthStr, setDisplayMonth } = useViewStore();
  const setHasNavigatedMonth = useViewStore((s) => s.setHasNavigatedMonth);
  const insets = useSafeAreaInsets();

  // 从全局状态获取 displayMonth，转换为 Date 对象
  const displayMonth = useMemo(() => {
    const date = new Date(displayMonthStr);
    return startOfMonth(date);
  }, [displayMonthStr]);

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isAnimating = useSharedValue(false);
  const prevDisplayMonthRef = useRef(displayMonthStr);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const calendarHeight = useSharedValue(EXPANDED_HEIGHT);
  const dragStartHeight = useSharedValue(EXPANDED_HEIGHT);

  const prevMonth = useMemo(() => subMonths(displayMonth, 1), [displayMonth]);
  const nextMonth = useMemo(() => addMonths(displayMonth, 1), [displayMonth]);

  // 当 selectedDate 从外部变化时（如从年视图点击月份），同步 displayMonth
  // 注意：不将 displayMonth 放入依赖，避免滑动切换时被重置
  useLayoutEffect(() => {
    setDisplayMonth(startOfMonth(new Date(selectedDate)).toISOString().split("T")[0]);
  }, [selectedDate, setDisplayMonth]);

  const goToPreviousJS = useCallback(() => {
    const newMonth = subMonths(displayMonth, 1);
    setDisplayMonth(newMonth.toISOString().split("T")[0]);
    setHasNavigatedMonth(true);
  }, [displayMonth, setDisplayMonth, setHasNavigatedMonth]);

  const goToNextJS = useCallback(() => {
    const newMonth = addMonths(displayMonth, 1);
    setDisplayMonth(newMonth.toISOString().split("T")[0]);
    setHasNavigatedMonth(true);
  }, [displayMonth, setDisplayMonth, setHasNavigatedMonth]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // 当 displayMonth 更新后，使用 useLayoutEffect 同步重置 translateX
  // 这确保在浏览器绘制之前完成重置，避免闪烁
  // 同时处理大跨度跳转的淡入淡出动画
  useLayoutEffect(() => {
    const prevMonth = prevDisplayMonthRef.current;
    prevDisplayMonthRef.current = displayMonthStr;

    if (prevMonth && displayMonthStr) {
      const prevDate = new Date(prevMonth);
      const currentDate = new Date(displayMonthStr);
      const monthDiff = (currentDate.getFullYear() - prevDate.getFullYear()) * 12
        + currentDate.getMonth() - prevDate.getMonth();

      if (Math.abs(monthDiff) > 1) {
        // 大跨度跳转：使用淡入淡出动画
        opacity.value = 0;
        translateX.value = 0;
        isAnimating.value = false;
        // 下一帧淡入
        runOnUI(() => {
          "worklet";
          opacity.value = withTiming(1, { duration: 200 });
        })();
      } else {
        // 正常滑动：重置位置
        translateX.value = 0;
        isAnimating.value = false;
      }
    } else {
      translateX.value = 0;
      isAnimating.value = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMonthStr]);

  // 折叠高度动画
  useLayoutEffect(() => {
    calendarHeight.value = withTiming(
      isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
      { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
  }, [isCollapsed, calendarHeight]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (isAnimating.value) return;
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (isAnimating.value) return;

      const { translationX, velocityX } = event;
      const shouldSwipeLeft =
        translationX < -SWIPE_DISTANCE_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeRight =
        translationX > SWIPE_DISTANCE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeLeft) {
        isAnimating.value = true;
        translateX.value = withTiming(
          -SCREEN_WIDTH,
          { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
          (finished) => {
            if (finished) {
              // 只更新 React 状态，translateX 在 useEffect 中重置
              scheduleOnRN(goToNextJS);
            }
          }
        );
      } else if (shouldSwipeRight) {
        isAnimating.value = true;
        translateX.value = withTiming(
          SCREEN_WIDTH,
          { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
          (finished) => {
            if (finished) {
              // 只更新 React 状态，translateX 在 useEffect 中重置
              scheduleOnRN(goToPreviousJS);
            }
          }
        );
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const prevMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
  }));

  const nextMonthStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
  }));

  const calendarHeightStyle = useAnimatedStyle(() => ({
    height: calendarHeight.value,
  }));

  // 折叠手势（垂直滑动）- 实现手势跟随
  const foldGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      // 记录开始拖动时的高度
      dragStartHeight.value = calendarHeight.value;
    })
    .onUpdate((event) => {
      // 实时跟随手指移动
      // 向下拖动（translationY > 0）= 展开，向上拖动（translationY < 0）= 折叠
      const newHeight = Math.max(
        COLLAPSED_HEIGHT,
        Math.min(EXPANDED_HEIGHT, dragStartHeight.value + event.translationY)
      );
      calendarHeight.value = newHeight;
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const shouldExpand =
        translationY > FOLD_DISTANCE_THRESHOLD || velocityY > FOLD_VELOCITY_THRESHOLD;
      const shouldFold =
        translationY < -FOLD_DISTANCE_THRESHOLD || velocityY < -FOLD_VELOCITY_THRESHOLD;

      if (shouldFold && !isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else if (shouldExpand && isCollapsed) {
        scheduleOnRN(toggleCollapse);
      } else {
        // 没有达到阈值，恢复到当前状态的高度
        calendarHeight.value = withTiming(
          isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
          { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
        );
      }
    });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* Fixed weekday header */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, idx) => (
          <Text
            key={day}
            style={[
              styles.weekdayText,
              { color: idx >= 5 ? theme.colors.weekendText : theme.colors.textTertiary },
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Swipeable month grids with fold gesture - 用 View 包裹整个可折叠区域 */}
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, foldGesture)}>
        <View style={styles.foldableArea}>
          <Animated.View style={[styles.monthsContainer, calendarHeightStyle]}>
            <Animated.View
              style={[styles.monthPanel, prevMonthStyle]}
            >
              <MonthGrid
                year={prevMonth.getFullYear()}
                month={prevMonth.getMonth()}
                fidelity="full"
              />
            </Animated.View>

            <Animated.View style={[styles.monthPanel, animatedStyle]}>
              <MonthGrid
                year={displayMonth.getFullYear()}
                month={displayMonth.getMonth()}
                fidelity="full"
              />
            </Animated.View>

            <Animated.View
              style={[styles.monthPanel, nextMonthStyle]}
            >
              <MonthGrid
                year={nextMonth.getFullYear()}
                month={nextMonth.getMonth()}
                fidelity="full"
              />
            </Animated.View>
          </Animated.View>

          {/* Collapse indicator */}
          <View style={styles.collapseIndicator}>
            <Ionicons
              name="remove"
              size={20}
              color={theme.colors.textTertiary}
            />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  foldableArea: {
    flex: 1,
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    marginLeft: 16,
    marginRight: 16,
  },
  weekdayText: {
    fontSize: 12,
    textAlign: "center",
    width: "14.28%",
  },
  monthsContainer: {
    overflow: "hidden",
  },
  monthPanel: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    bottom: 100,
  },
  collapseIndicator: {
    alignItems: "center",
    paddingVertical: 4,
  },
  collapseText: {
    fontSize: 16,
  },
});

export default MonthView;
