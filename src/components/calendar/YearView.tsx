import {
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getMonth,
  getYear,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subYears,
} from "date-fns";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getStatutoryHolidaySetForMonth } from "@/src/domain/lunar";
import { useViewStore } from "@/src/stores/eventStore";
import { useTheme } from "@/src/stores/themeStore";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PRIMARY_COLOR = "#E8563A";
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

interface MiniMonthGridProps {
  year: number;
  month: number;
  onMonthPress: (
    date: Date,
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
  selectedDate: Date;
  onMeasure?: (
    month: number,
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const GRID_MARGIN = 16;
const CELL_WIDTH = ((SCREEN_WIDTH - GRID_MARGIN * 2) / 3 - 12) / 7;

const MiniMonthGrid = React.memo<MiniMonthGridProps>(function MiniMonthGrid({
  year,
  month,
  onMonthPress,
  selectedDate,
  onMeasure,
}) {
  const { theme } = useTheme();
  const ref = useRef<View>(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;

  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const days = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [monthDate]);

  const holidaySet = useMemo(() => getStatutoryHolidaySetForMonth(year, month), [year, month]);

  const today = useMemo(() => new Date(), []);
  const isSelectedMonth = isSameMonth(monthDate, selectedDate);

  const handlePress = () => {
    const cached = useViewStore.getState().yearCellLayouts[month];
    if (cached) {
      onMonthPress(monthDate, cached);
      return;
    }
    ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
      onMonthPress(monthDate, { x: pageX, y: pageY, width, height });
    });
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
        onMeasureRef.current?.(month, { x: pageX, y: pageY, width, height });
      });
    });
  }, [month]);

  return (
    <TouchableOpacity
      ref={ref}
      style={styles.miniMonthContainer}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.miniMonthTitle,
          {
            color: isSelectedMonth ? PRIMARY_COLOR : theme.colors.text,
          },
        ]}
      >
        {format(monthDate, "M月")}
      </Text>

      <View style={styles.miniWeekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={[styles.miniCell, styles.miniWeekCell]}>
            <Text style={[styles.miniWeekText, { color: theme.colors.textSecondary }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.miniDaysGrid}>
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, today);
          const dayKey = format(day, "yyyy-MM-dd");
          const isHolidayDay = holidaySet.has(dayKey);

          if (!isCurrentMonth) {
            return <View key={dayKey} style={styles.miniCell} />;
          }

          return (
            <View
              key={dayKey}
              style={[
                styles.miniCell,
                isToday && {
                  backgroundColor: PRIMARY_COLOR,
                  borderRadius: 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniDayText,
                  { color: isToday ? "#FFFFFF" : isHolidayDay ? PRIMARY_COLOR : theme.colors.text },
                ]}
              >
                {format(day, "d")}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
});
MiniMonthGrid.displayName = "MiniMonthGrid";

interface YearViewProps {
  onMonthPress?: (
    date: Date,
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
}

export const YearView: React.FC<YearViewProps> = ({ onMonthPress: externalOnMonthPress }) => {
  const { theme } = useTheme();
  const selectedDate = useViewStore((s) => s.selectedDate);
  const setSelectedDate = useViewStore((s) => s.setSelectedDate);
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setTransitionState = useViewStore((s) => s.setTransitionState);
  const hasNavigatedMonth = useViewStore((s) => s.hasNavigatedMonth);

  const currentSelectedDate = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const [displayYear, setDisplayYear] = useState(getYear(currentSelectedDate));
  const [renderAdjacent, setRenderAdjacent] = useState(false);
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  // 首屏先渲染当前年面板,下一帧再挂 prev/next 以避免首次进入年视图时阻塞动画
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRenderAdjacent(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const prevYear = useMemo(() => subYears(new Date(displayYear, 0, 1), 1), [displayYear]);
  const nextYear = useMemo(() => addYears(new Date(displayYear, 0, 1), 1), [displayYear]);

  const goToPreviousYearJS = useCallback(() => {
    const newYear = displayYear - 1;
    setDisplayYear(newYear);
    const month = hasNavigatedMonth ? getMonth(parseISO(selectedDate)) : 0;
    setSelectedDate(format(new Date(newYear, month, 1), "yyyy-MM-dd"));
  }, [displayYear, selectedDate, setSelectedDate, hasNavigatedMonth]);

  const goToNextYearJS = useCallback(() => {
    const newYear = displayYear + 1;
    setDisplayYear(newYear);
    const month = hasNavigatedMonth ? getMonth(parseISO(selectedDate)) : 0;
    setSelectedDate(format(new Date(newYear, month, 1), "yyyy-MM-dd"));
  }, [displayYear, selectedDate, setSelectedDate, hasNavigatedMonth]);

  const handleMonthPress = useCallback(
    (monthDate: Date, layout: { x: number; y: number; width: number; height: number }) => {
      if (externalOnMonthPress) {
        externalOnMonthPress(monthDate, layout);
        return;
      }

      setTransitionState({
        sourceLayout: layout,
      });
      // 当前月份：选中今天；非当前月份：选中首日
      const today = new Date();
      if (isSameMonth(monthDate, today)) {
        setSelectedDate(format(today, "yyyy-MM-dd"));
      } else {
        setSelectedDate(format(monthDate, "yyyy-MM-dd"));
      }
      setCurrentView("month");
    },
    [setSelectedDate, setCurrentView, setTransitionState, externalOnMonthPress]
  );

  // Collect cell measurements for Month→Year animation
  const pendingMeasurements = useRef<
    Record<number, { x: number; y: number; width: number; height: number }>
  >({});

  const handleCellMeasure = useCallback(
    (month: number, layout: { x: number; y: number; width: number; height: number }) => {
      pendingMeasurements.current[month] = layout;
      if (Object.keys(pendingMeasurements.current).length === 12) {
        useViewStore.getState().setYearCellLayouts({ ...pendingMeasurements.current });
      }
    },
    []
  );

  React.useLayoutEffect(() => {
    translateX.value = 0;
    isAnimating.value = false;
    pendingMeasurements.current = {};
  }, [translateX, isAnimating]);

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
              runOnJS(goToNextYearJS)();
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
              runOnJS(goToPreviousYearJS)();
            }
          }
        );
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const prevYearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - SCREEN_WIDTH }],
  }));

  const nextYearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + SCREEN_WIDTH }],
  }));

  const renderYearGrid = useCallback(
    (year: number, isCurrentYear: boolean) => {
      const months = Array.from({ length: 12 }, (_, i) => i);

      return (
        <View style={styles.yearGrid}>
          {months.map((month) => (
            <MiniMonthGrid
              key={`${year}-${month}`}
              year={year}
              month={month}
              onMonthPress={handleMonthPress}
              onMeasure={isCurrentYear ? handleCellMeasure : undefined}
              selectedDate={currentSelectedDate}
            />
          ))}
        </View>
      );
    },
    [handleMonthPress, handleCellMeasure, currentSelectedDate]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* <View style={styles.yearHeader}>
        <Text style={[styles.yearTitle, { color: theme.colors.text }]}>
          {displayYear}年
        </Text>
      </View> */}

      <GestureDetector gesture={panGesture}>
        <View style={styles.yearsContainer}>
          <Animated.View style={[styles.yearPanel, prevYearStyle]}>
            {renderAdjacent && renderYearGrid(getYear(prevYear), false)}
          </Animated.View>

          <Animated.View style={[styles.yearPanel, animatedStyle]}>
            {renderYearGrid(displayYear, true)}
          </Animated.View>

          <Animated.View style={[styles.yearPanel, nextYearStyle]}>
            {renderAdjacent && renderYearGrid(getYear(nextYear), false)}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  yearHeader: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: "500",
  },
  yearsContainer: {
    flex: 1,
    overflow: "hidden",
  },
  yearPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 100,
    overflow: "hidden",
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
  },
  miniMonthContainer: {
    width: "33.33%",
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  miniMonthTitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "left",
    marginBottom: 4,
  },
  miniWeekRow: {
    flexDirection: "row",
  },
  miniWeekCell: {
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  miniWeekText: {
    fontSize: 9,
  },
  miniDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  miniCell: {
    width: CELL_WIDTH,
    height: CELL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  miniDayText: {
    fontSize: 11,
  },
});

export default YearView;
