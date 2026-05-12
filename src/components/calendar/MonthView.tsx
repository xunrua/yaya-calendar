// 月视图组件

import { Ionicons } from "@expo/vector-icons";
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import type React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getLunarInfoBatch } from "../../domain/lunar";
import { useEventStore, useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import {
  calculateGridHeight,
  calculateSingleRowHeight,
  getCalendarRowCount,
  getRowIndexForDate,
} from "../../utils/calendar";
import { DayInfoPanel } from "./DayInfoPanel";
import MonthGrid from "./MonthGrid";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_VELOCITY_THRESHOLD = 500; // 滑动速度阈值（px/s）
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3; // 滑动距离阈值
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const FOLD_VELOCITY_THRESHOLD = 300; // 折叠速度阈值
const FOLD_DISTANCE_THRESHOLD = SCREEN_HEIGHT * 0.05; // 折叠距离阈值

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const selectedDate = useViewStore((s) => s.selectedDate);
  const displayMonthStr = useViewStore((s) => s.displayMonth);
  const setDisplayMonth = useViewStore((s) => s.setDisplayMonth);
  const setSelectedDate = useViewStore((s) => s.setSelectedDate);
  const setHasNavigatedMonth = useViewStore((s) => s.setHasNavigatedMonth);

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
  const calendarHeight = useSharedValue(320); // 初始值，会在 useLayoutEffect 中更新
  const dragStartHeight = useSharedValue(320);

  // 折叠进度 shared value（0=展开, 1=折叠）
  const foldProgress = useSharedValue(0);

  // 三屏高度 shared values（用于动态高度计算）
  const currentHeight = useSharedValue(0);
  const prevHeight = useSharedValue(0);
  const nextHeight = useSharedValue(0);
  // 折叠状态同步为 shared value（用于 worklet 中访问）
  const isCollapsedSV = useSharedValue(false);

  const prevMonth = useMemo(() => subMonths(displayMonth, 1), [displayMonth]);
  const nextMonth = useMemo(() => addMonths(displayMonth, 1), [displayMonth]);

  // 预计算三屏行数
  const prevRowCount = useMemo(
    () => getCalendarRowCount(prevMonth.getFullYear(), prevMonth.getMonth()),
    [prevMonth]
  );
  const currentRowCount = useMemo(
    () => getCalendarRowCount(displayMonth.getFullYear(), displayMonth.getMonth()),
    [displayMonth]
  );
  const nextRowCount = useMemo(
    () => getCalendarRowCount(nextMonth.getFullYear(), nextMonth.getMonth()),
    [nextMonth]
  );

  // 展开高度 = 当月高度（用于折叠动画）
  const EXPANDED_HEIGHT = useMemo(
    () => calculateGridHeight(currentRowCount, screenWidth),
    [currentRowCount, screenWidth]
  );

  // 折叠高度 = 单行高度
  const COLLAPSED_HEIGHT = useMemo(() => calculateSingleRowHeight(screenWidth), [screenWidth]);

  // 计算目标行索引（优先选中日期，否则用今天）
  const targetRowIndex = useMemo(() => {
    const targetDateStr = selectedDate || new Date().toISOString().split("T")[0];
    const targetDate = new Date(targetDateStr);
    return getRowIndexForDate(targetDate, displayMonth.getFullYear(), displayMonth.getMonth());
  }, [selectedDate, displayMonth]);

  // 折叠状态下：计算上一周/下一周所在的月份和行索引（用于三屏预渲染）
  const currentWeekTargetDate = useMemo(() => {
    const targetDateStr = selectedDate || new Date().toISOString().split("T")[0];
    return new Date(targetDateStr);
  }, [selectedDate]);

  const prevWeekInfo = useMemo(() => {
    const prevWeekDate = subDays(currentWeekTargetDate, 7);
    const prevWeekMonth = startOfMonth(prevWeekDate);
    const rowIndex = getRowIndexForDate(
      prevWeekDate,
      prevWeekMonth.getFullYear(),
      prevWeekMonth.getMonth()
    );
    return { month: prevWeekMonth, rowIndex, date: prevWeekDate };
  }, [currentWeekTargetDate]);

  const nextWeekInfo = useMemo(() => {
    const nextWeekDate = addDays(currentWeekTargetDate, 7);
    const nextWeekMonth = startOfMonth(nextWeekDate);
    const rowIndex = getRowIndexForDate(
      nextWeekDate,
      nextWeekMonth.getFullYear(),
      nextWeekMonth.getMonth()
    );
    return { month: nextWeekMonth, rowIndex, date: nextWeekDate };
  }, [currentWeekTargetDate]);

  // 预计算三屏农历信息
  const prevLunarInfoMap = useMemo(() => {
    const result = getLunarInfoBatch(prevMonth.getFullYear(), prevMonth.getMonth());
    return result;
  }, [prevMonth]);
  const currentLunarInfoMap = useMemo(() => {
    const result = getLunarInfoBatch(displayMonth.getFullYear(), displayMonth.getMonth());
    return result;
  }, [displayMonth]);
  const nextLunarInfoMap = useMemo(() => {
    const result = getLunarInfoBatch(nextMonth.getFullYear(), nextMonth.getMonth());
    return result;
  }, [nextMonth]);

  // 预计算三屏事件数据
  const getEventsForMonth = useEventStore((s) => s.getEventsForMonth);
  const prevEventsMap = useMemo(
    () => getEventsForMonth(prevMonth.getFullYear(), prevMonth.getMonth()),
    [prevMonth, getEventsForMonth]
  );
  const currentEventsMap = useMemo(
    () => getEventsForMonth(displayMonth.getFullYear(), displayMonth.getMonth()),
    [displayMonth, getEventsForMonth]
  );
  const nextEventsMap = useMemo(
    () => getEventsForMonth(nextMonth.getFullYear(), nextMonth.getMonth()),
    [nextMonth, getEventsForMonth]
  );

  // 折叠状态下的农历和事件预计算
  const prevWeekLunarInfoMap = useMemo(
    () =>
      isCollapsed
        ? getLunarInfoBatch(prevWeekInfo.month.getFullYear(), prevWeekInfo.month.getMonth())
        : new Map(),
    [isCollapsed, prevWeekInfo.month]
  );
  const nextWeekLunarInfoMap = useMemo(
    () =>
      isCollapsed
        ? getLunarInfoBatch(nextWeekInfo.month.getFullYear(), nextWeekInfo.month.getMonth())
        : new Map(),
    [isCollapsed, nextWeekInfo.month]
  );
  const prevWeekEventsMap = useMemo(
    () =>
      isCollapsed
        ? getEventsForMonth(prevWeekInfo.month.getFullYear(), prevWeekInfo.month.getMonth())
        : new Map(),
    [isCollapsed, prevWeekInfo.month, getEventsForMonth]
  );
  const nextWeekEventsMap = useMemo(
    () =>
      isCollapsed
        ? getEventsForMonth(nextWeekInfo.month.getFullYear(), nextWeekInfo.month.getMonth())
        : new Map(),
    [isCollapsed, nextWeekInfo.month, getEventsForMonth]
  );

  // 初始化三屏高度
  useLayoutEffect(() => {
    currentHeight.value = calculateGridHeight(currentRowCount, screenWidth);
    prevHeight.value = calculateGridHeight(prevRowCount, screenWidth);
    nextHeight.value = calculateGridHeight(nextRowCount, screenWidth);
    // 初始化 calendarHeight
    if (calendarHeight.value === 320) {
      calendarHeight.value = currentHeight.value;
      dragStartHeight.value = currentHeight.value;
    }
  }, [
    currentRowCount,
    prevRowCount,
    nextRowCount,
    screenWidth,
    currentHeight,
    prevHeight,
    nextHeight,
    calendarHeight,
    dragStartHeight,
  ]);

  // 同步折叠状态到 shared value
  useEffect(() => {
    isCollapsedSV.value = isCollapsed;
  }, [isCollapsed, isCollapsedSV]);

  // 当 selectedDate 从外部变化时（如从年视图点击月份），同步 displayMonth
  useLayoutEffect(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
    setDisplayMonth(monthStartStr);
  }, [selectedDate, setDisplayMonth]);

  const goToPreviousJS = useCallback(() => {
    const [year, month] = displayMonthStr.split("-").map(Number);
    const currentDisplayMonth = new Date(year, month - 1, 1);
    const newMonth = subMonths(currentDisplayMonth, 1);
    const newMonthStr = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, "0")}-01`;
    setDisplayMonth(newMonthStr);
    setHasNavigatedMonth(true);

    // 切换月份时同步选中日期
    const today = new Date();
    if (isSameMonth(newMonth, today)) {
      // 当前月份：选中今天
      setSelectedDate(today.toISOString().split("T")[0]);
    } else {
      // 非当前月份：选中首日
      setSelectedDate(newMonthStr);
    }
  }, [displayMonthStr, setDisplayMonth, setHasNavigatedMonth, setSelectedDate]);

  const goToNextJS = useCallback(() => {
    const [year, month] = displayMonthStr.split("-").map(Number);
    const currentDisplayMonth = new Date(year, month - 1, 1);
    const newMonth = addMonths(currentDisplayMonth, 1);
    const newMonthStr = `${newMonth.getFullYear()}-${String(newMonth.getMonth() + 1).padStart(2, "0")}-01`;
    setDisplayMonth(newMonthStr);
    setHasNavigatedMonth(true);

    // 切换月份时同步选中日期
    const today = new Date();
    if (isSameMonth(newMonth, today)) {
      // 当前月份：选中今天
      setSelectedDate(today.toISOString().split("T")[0]);
    } else {
      // 非当前月份：选中首日
      setSelectedDate(newMonthStr);
    }
  }, [displayMonthStr, setDisplayMonth, setHasNavigatedMonth, setSelectedDate]);

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
      const [prevYear, prevMonthNum] = prevMonth.split("-").map(Number);
      const [currYear, currMonthNum] = displayMonthStr.split("-").map(Number);
      const monthDiff = (currYear - prevYear) * 12 + (currMonthNum - prevMonthNum);

      if (Math.abs(monthDiff) > 1) {
        // 大跨度跳转：直接显示，避免淡入淡出导致的闪烁
        translateX.value = 0;
        isAnimating.value = false;
        // 重置高度到当月高度或折叠高度
        if (isCollapsedSV.value) {
          calendarHeight.value = COLLAPSED_HEIGHT;
          foldProgress.value = 1;
        } else {
          calendarHeight.value = currentHeight.value;
          foldProgress.value = 0;
        }
      } else {
        // 正常滑动：重置位置
        translateX.value = 0;
        isAnimating.value = false;
        // 折叠状态下保持折叠高度
        if (isCollapsedSV.value) {
          calendarHeight.value = COLLAPSED_HEIGHT;
          foldProgress.value = 1;
        }
      }
    } else {
      translateX.value = 0;
      isAnimating.value = false;
    }
  }, [
    displayMonthStr,
    translateX,
    isAnimating,
    calendarHeight,
    currentHeight,
    isCollapsedSV,
    COLLAPSED_HEIGHT,
    foldProgress,
  ]);

  // 折叠高度动画
  useLayoutEffect(() => {
    calendarHeight.value = withTiming(isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    foldProgress.value = withTiming(isCollapsed ? 1 : 0, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isCollapsed, EXPANDED_HEIGHT, COLLAPSED_HEIGHT, calendarHeight, foldProgress]);

  // 切换周的回调（折叠状态下使用）
  const goToNextWeekJS = useCallback(() => {
    translateX.value = 0;
    const currentDate = new Date(selectedDate);
    const nextWeek = addDays(currentDate, 7);

    // 切换周时同步选中日期：如果新周包含今天则选中今天，否则选中周一
    const today = new Date();
    const weekStart = startOfWeek(nextWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(nextWeek, { weekStartsOn: 1 });
    if (today >= weekStart && today <= weekEnd) {
      setSelectedDate(format(today, "yyyy-MM-dd"));
    } else {
      setSelectedDate(format(weekStart, "yyyy-MM-dd"));
    }

    if (!isSameMonth(nextWeek, displayMonth)) {
      setDisplayMonth(format(startOfMonth(nextWeek), "yyyy-MM-dd"));
    }
  }, [selectedDate, displayMonth, setSelectedDate, setDisplayMonth, translateX]);

  const goToPrevWeekJS = useCallback(() => {
    translateX.value = 0;
    const currentDate = new Date(selectedDate);
    const prevWeek = subDays(currentDate, 7);

    // 切换周时同步选中日期：如果新周包含今天则选中今天，否则选中周一
    const today = new Date();
    const weekStart = startOfWeek(prevWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(prevWeek, { weekStartsOn: 1 });
    if (today >= weekStart && today <= weekEnd) {
      setSelectedDate(format(today, "yyyy-MM-dd"));
    } else {
      setSelectedDate(format(weekStart, "yyyy-MM-dd"));
    }

    if (!isSameMonth(prevWeek, displayMonth)) {
      setDisplayMonth(format(startOfMonth(prevWeek), "yyyy-MM-dd"));
    }
  }, [selectedDate, displayMonth, setSelectedDate, setDisplayMonth, translateX]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (isAnimating.value) return;
      translateX.value = event.translationX;

      // 折叠状态下不动态调整高度
      if (isCollapsedSV.value) return;

      // 动态高度计算（clamp progress 到 [0, 1]）
      const progress = Math.min(1, Math.max(0, Math.abs(event.translationX) / SCREEN_WIDTH));
      if (event.translationX < 0) {
        // 向左滑 → 下月
        calendarHeight.value =
          currentHeight.value + (nextHeight.value - currentHeight.value) * progress;
      } else {
        // 向右滑 → 上月
        calendarHeight.value =
          currentHeight.value + (prevHeight.value - currentHeight.value) * progress;
      }
    })
    .onEnd((event) => {
      if (isAnimating.value) return;

      const { translationX, velocityX } = event;
      const shouldSwipeLeft =
        translationX < -SWIPE_DISTANCE_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeRight =
        translationX > SWIPE_DISTANCE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD;

      // 折叠状态：切换周
      if (isCollapsedSV.value) {
        if (shouldSwipeLeft) {
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 150 });
          setTimeout(() => {
            runOnJS(goToNextWeekJS)();
          }, 150);
        } else if (shouldSwipeRight) {
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 150 });
          setTimeout(() => {
            runOnJS(goToPrevWeekJS)();
          }, 150);
        } else {
          // 取消滑动：回弹到当前位置
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
        return;
      }

      // 展开状态：切换月份
      if (shouldSwipeLeft) {
        isAnimating.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        // 高度动画到下月高度
        calendarHeight.value = withTiming(nextHeight.value, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        // 延迟执行跳转，让动画完成
        setTimeout(() => {
          runOnJS(goToNextJS)();
        }, 200);
      } else if (shouldSwipeRight) {
        isAnimating.value = true;
        translateX.value = withTiming(SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        // 高度动画到上月高度
        calendarHeight.value = withTiming(prevHeight.value, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        setTimeout(() => {
          runOnJS(goToPreviousJS)();
        }, 200);
      } else {
        // 取消滑动：回弹到当前位置
        translateX.value = withSpring(0, SPRING_CONFIG);
        // 高度回弹到当月高度
        calendarHeight.value = withTiming(currentHeight.value, { duration: 200 });
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

  // 折叠手势（垂直滑动）- 用于月份网格区域，与水平滑动共存
  const foldGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      dragStartHeight.value = calendarHeight.value;
    })
    .onUpdate((event) => {
      const newHeight = Math.max(
        COLLAPSED_HEIGHT,
        Math.min(EXPANDED_HEIGHT, dragStartHeight.value + event.translationY)
      );
      calendarHeight.value = newHeight;
      // 同步更新折叠进度
      foldProgress.value =
        1 - (newHeight - COLLAPSED_HEIGHT) / (EXPANDED_HEIGHT - COLLAPSED_HEIGHT);
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const shouldExpand =
        translationY > FOLD_DISTANCE_THRESHOLD || velocityY > FOLD_VELOCITY_THRESHOLD;
      const shouldFold =
        translationY < -FOLD_DISTANCE_THRESHOLD || velocityY < -FOLD_VELOCITY_THRESHOLD;

      const currentlyCollapsed = isCollapsedSV.value;

      if (shouldFold && !currentlyCollapsed) {
        runOnJS(toggleCollapse)();
      } else if (shouldExpand && currentlyCollapsed) {
        runOnJS(toggleCollapse)();
      } else {
        calendarHeight.value = withTiming(currentlyCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT, {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        foldProgress.value = withTiming(currentlyCollapsed ? 1 : 0, {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  // 折叠指示器专用手势 - 仅响应垂直滑动，不限制水平偏移
  const indicatorFoldGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      dragStartHeight.value = calendarHeight.value;
    })
    .onUpdate((event) => {
      const newHeight = Math.max(
        COLLAPSED_HEIGHT,
        Math.min(EXPANDED_HEIGHT, dragStartHeight.value + event.translationY)
      );
      calendarHeight.value = newHeight;
      // 同步更新折叠进度
      foldProgress.value =
        1 - (newHeight - COLLAPSED_HEIGHT) / (EXPANDED_HEIGHT - COLLAPSED_HEIGHT);
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const shouldExpand =
        translationY > FOLD_DISTANCE_THRESHOLD || velocityY > FOLD_VELOCITY_THRESHOLD;
      const shouldFold =
        translationY < -FOLD_DISTANCE_THRESHOLD || velocityY < -FOLD_VELOCITY_THRESHOLD;

      const currentlyCollapsed = isCollapsedSV.value;

      if (shouldFold && !currentlyCollapsed) {
        runOnJS(toggleCollapse)();
      } else if (shouldExpand && currentlyCollapsed) {
        runOnJS(toggleCollapse)();
      } else {
        calendarHeight.value = withTiming(currentlyCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT, {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        foldProgress.value = withTiming(currentlyCollapsed ? 1 : 0, {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  // 折叠指示器点击手势 - 仅在折叠状态下响应点击展开
  const indicatorTapGesture = Gesture.Tap().onEnd(() => {
    if (isCollapsed) {
      runOnJS(toggleCollapse);
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

      {/* Swipeable month grids with fold gesture */}
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, foldGesture)}>
        <Animated.View style={[styles.monthsContainer, calendarHeightStyle]}>
          {isCollapsed ? (
            // 折叠状态：周级别三屏渲染
            <>
              <Animated.View style={[styles.monthPanel, prevMonthStyle]}>
                <MonthGrid
                  year={prevWeekInfo.month.getFullYear()}
                  month={prevWeekInfo.month.getMonth()}
                  fidelity="full"
                  targetRowIndex={prevWeekInfo.rowIndex}
                  foldProgress={foldProgress}
                  screenWidth={screenWidth}
                  lunarInfoMap={prevWeekLunarInfoMap}
                  eventsMap={prevWeekEventsMap}
                />
              </Animated.View>

              <Animated.View style={[styles.monthPanel, animatedStyle]}>
                <MonthGrid
                  year={displayMonth.getFullYear()}
                  month={displayMonth.getMonth()}
                  fidelity="full"
                  targetRowIndex={targetRowIndex}
                  foldProgress={foldProgress}
                  screenWidth={screenWidth}
                  lunarInfoMap={currentLunarInfoMap}
                  eventsMap={currentEventsMap}
                />
              </Animated.View>

              <Animated.View style={[styles.monthPanel, nextMonthStyle]}>
                <MonthGrid
                  year={nextWeekInfo.month.getFullYear()}
                  month={nextWeekInfo.month.getMonth()}
                  fidelity="full"
                  targetRowIndex={nextWeekInfo.rowIndex}
                  foldProgress={foldProgress}
                  screenWidth={screenWidth}
                  lunarInfoMap={nextWeekLunarInfoMap}
                  eventsMap={nextWeekEventsMap}
                />
              </Animated.View>
            </>
          ) : (
            // 展开状态：月份级别三屏渲染
            <>
              <Animated.View style={[styles.monthPanel, prevMonthStyle]}>
                <MonthGrid
                  year={prevMonth.getFullYear()}
                  month={prevMonth.getMonth()}
                  fidelity="full"
                  lunarInfoMap={prevLunarInfoMap}
                  eventsMap={prevEventsMap}
                />
              </Animated.View>

              <Animated.View style={[styles.monthPanel, animatedStyle]}>
                <MonthGrid
                  year={displayMonth.getFullYear()}
                  month={displayMonth.getMonth()}
                  fidelity="full"
                  targetRowIndex={targetRowIndex}
                  foldProgress={foldProgress}
                  screenWidth={screenWidth}
                  lunarInfoMap={currentLunarInfoMap}
                  eventsMap={currentEventsMap}
                />
              </Animated.View>

              <Animated.View style={[styles.monthPanel, nextMonthStyle]}>
                <MonthGrid
                  year={nextMonth.getFullYear()}
                  month={nextMonth.getMonth()}
                  fidelity="full"
                  lunarInfoMap={nextLunarInfoMap}
                  eventsMap={nextEventsMap}
                />
              </Animated.View>
            </>
          )}
        </Animated.View>
      </GestureDetector>

      {/* Collapse indicator area - includes indicator and space below it */}
      <GestureDetector gesture={Gesture.Simultaneous(indicatorFoldGesture, indicatorTapGesture)}>
        <View style={styles.collapseIndicatorArea}>
          <View style={styles.collapseIndicator}>
            <Ionicons
              name={isCollapsed ? "chevron-down" : "remove"}
              size={20}
              color={theme.colors.textTertiary}
            />
          </View>

          {/* 日期信息面板 */}
          <DayInfoPanel date={selectedDate} />
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
    marginTop: 16,
  },
  monthPanel: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    bottom: 100,
  },
  collapseIndicatorArea: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 4,
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
