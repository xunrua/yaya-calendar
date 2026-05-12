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
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getHolidays } from "@/src/domain/lunar";
import { useViewStore } from "@/src/stores/eventStore";
import { useTheme } from "@/src/stores/themeStore";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PRIMARY_COLOR = "#E8563A";
const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SPRING_CONFIG = { damping: 20, stiffness: 100 };

// 法定假日列表
const STATUTORY_HOLIDAYS = ["元旦", "春节", "清明节", "劳动节", "端午节", "中秋节", "国庆节"];

const isStatutoryHoliday = (date: Date): boolean => {
  const holidays = getHolidays(date);
  return holidays.some((h) => STATUTORY_HOLIDAYS.includes(h.name));
};

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

// 预计算一个月的天数数据（避免在渲染时计算）
const computeMonthDays = (year: number, month: number) => {
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: calStart, end: calEnd });
};

// 缓存月份天数数据
const monthDaysCache = new Map<string, Date[]>();
const getMonthDays = (year: number, month: number) => {
  const key = `${year}-${month}`;
  if (!monthDaysCache.has(key)) {
    monthDaysCache.set(key, computeMonthDays(year, month));
  }
  return monthDaysCache.get(key)!;
};

// 缓存假日判断结果
const holidayCache = new Map<string, boolean>();
const isStatutoryHolidayCached = (date: Date): boolean => {
  const key = format(date, "yyyy-MM-dd");
  if (!holidayCache.has(key)) {
    const holidays = getHolidays(date);
    holidayCache.set(key, holidays.some((h) => STATUTORY_HOLIDAYS.includes(h.name)));
  }
  return holidayCache.get(key)!;
};

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

const MiniMonthGrid: React.FC<MiniMonthGridProps> = memo(({
  year,
  month,
  onMonthPress,
  selectedDate,
  onMeasure,
}) => {
  const { theme } = useTheme();
  const ref = useRef<View>(null);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;

  // 使用缓存的天数数据
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);

  const today = new Date();
  const isSelectedMonth = isSameMonth(monthDate, selectedDate);

  const handlePress = () => {
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

  // 预计算当月日期的显示数据
  const dayElements = useMemo(() => {
    return days.map((day) => {
      const isCurrentMonth = isSameMonth(day, monthDate);
      const isToday = isSameDay(day, today);
      const isHolidayDay = isStatutoryHolidayCached(day);
      const dayKey = format(day, "yyyy-MM-dd");

      if (!isCurrentMonth) {
        return { key: dayKey, isCurrentMonth: false };
      }

      const textColor = isToday ? "#FFFFFF" : isHolidayDay ? PRIMARY_COLOR : theme.colors.text;

      return {
        key: dayKey,
        isCurrentMonth: true,
        day: format(day, "d"),
        isToday,
        textColor,
      };
    });
  }, [days, monthDate, today, theme.colors.text]);

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
        {dayElements.map((item) => {
          if (!item.isCurrentMonth) {
            return <View key={item.key} style={styles.miniCell} />;
          }

          return (
            <View
              key={item.key}
              style={[
                styles.miniCell,
                item.isToday && {
                  backgroundColor: PRIMARY_COLOR,
                  borderRadius: 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniDayText,
                  { color: item.textColor },
                ]}
              >
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
});

export const YearView: React.FC = () => {
  const { theme } = useTheme();
  const selectedDate = useViewStore((s) => s.selectedDate);
  const setSelectedDate = useViewStore((s) => s.setSelectedDate);
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setTransitionState = useViewStore((s) => s.setTransitionState);
  const hasNavigatedMonth = useViewStore((s) => s.hasNavigatedMonth);

  const currentSelectedDate = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const [displayYear, setDisplayYear] = useState(getYear(currentSelectedDate));
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

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
    [setSelectedDate, setCurrentView, setTransitionState]
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

  const renderYearGrid = useCallback((year: number, isCurrentYear: boolean) => {
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
  }, [handleMonthPress, handleCellMeasure, currentSelectedDate]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* <View style={styles.yearHeader}>
        <Text style={[styles.yearTitle, { color: theme.colors.text }]}>
          {displayYear}年
        </Text>
      </View> */}

      <GestureDetector gesture={panGesture}>
        <View style={styles.yearsContainer}>
          <Animated.View style={[styles.yearPanel, prevYearStyle]}>
            {renderYearGrid(getYear(prevYear), false)}
          </Animated.View>

          <Animated.View style={[styles.yearPanel, animatedStyle]}>
            {renderYearGrid(displayYear, true)}
          </Animated.View>

          <Animated.View style={[styles.yearPanel, nextYearStyle]}>
            {renderYearGrid(getYear(nextYear), false)}
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
