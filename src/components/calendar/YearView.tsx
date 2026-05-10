import {
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getYear,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subYears,
} from "date-fns";
import React, { useCallback, useMemo, useState, useRef } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../stores/themeStore";
import { useViewStore } from "../../stores/eventStore";
import { toLunarDate, getHolidays } from "../../domain/lunar";

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
  onMonthPress: (date: Date, layout: { x: number; y: number; width: number; height: number }) => void;
  selectedDate: Date;
}

const MiniMonthGrid: React.FC<MiniMonthGridProps> = ({
  year,
  month,
  onMonthPress,
  selectedDate,
}) => {
  const { theme } = useTheme();
  const ref = useRef<View>(null);
  const monthDate = new Date(year, month, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const today = new Date();
  const lunarDate = toLunarDate(monthDate);
  const isSelectedMonth = isSameMonth(monthDate, selectedDate);

  const handlePress = () => {
    ref.current?.measure((x, y, width, height, pageX, pageY) => {
      onMonthPress(monthDate, { x: pageX, y: pageY, width, height });
    });
  };

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
        {format(monthDate, "M月")} {lunarDate.monthName}
      </Text>

      <View style={styles.miniDaysGrid}>
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthDate);
          const isToday = isSameDay(day, today);
          const isHolidayDay = isStatutoryHoliday(day);

          if (!isCurrentMonth) {
            return <View key={idx} style={styles.miniEmptyCell} />;
          }

          const textColor = isToday
            ? "#FFFFFF"
            : isHolidayDay
              ? PRIMARY_COLOR
              : theme.colors.text;

          return (
            <View
              key={idx}
              style={[
                styles.miniDayCell,
                isToday && {
                  backgroundColor: PRIMARY_COLOR,
                  borderRadius: 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniDayText,
                  {
                    color: textColor,
                  },
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
};

export const YearView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, setSelectedDate, setCurrentView, setTransitionState } = useViewStore();
  const insets = useSafeAreaInsets();

  const currentSelectedDate = parseISO(selectedDate);
  const [displayYear, setDisplayYear] = useState(getYear(currentSelectedDate));
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);

  const prevYear = useMemo(() => subYears(new Date(displayYear, 0, 1), 1), [displayYear]);
  const nextYear = useMemo(() => addYears(new Date(displayYear, 0, 1), 1), [displayYear]);

  const goToPreviousYearJS = useCallback(() => {
    setDisplayYear((prev) => prev - 1);
  }, []);

  const goToNextYearJS = useCallback(() => {
    setDisplayYear((prev) => prev + 1);
  }, []);

  const handleMonthPress = useCallback((monthDate: Date, layout: { x: number; y: number; width: number; height: number }) => {
    // 设置过渡动画的源位置（月份格子的屏幕位置）
    setTransitionState({
      sourceLayout: layout,
    });
    setSelectedDate(format(monthDate, "yyyy-MM-dd"));
    setCurrentView("month");
  }, [setSelectedDate, setCurrentView, setTransitionState]);

  React.useLayoutEffect(() => {
    translateX.value = 0;
    isAnimating.value = false;
  }, [displayYear, translateX, isAnimating]);

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

  const renderYearGrid = (year: number) => {
    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
      <View style={styles.yearGrid}>
        {months.map((month) => (
          <MiniMonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            onMonthPress={handleMonthPress}
            selectedDate={currentSelectedDate}
          />
        ))}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.yearHeader}>
        <Text style={[styles.yearTitle, { color: theme.colors.text }]}>
          {displayYear}年
        </Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.yearsContainer}>
          <Animated.View style={[styles.yearPanel, prevYearStyle]}>
            {renderYearGrid(getYear(prevYear))}
          </Animated.View>

          <Animated.View style={[styles.yearPanel, animatedStyle]}>
            {renderYearGrid(displayYear)}
          </Animated.View>

          <Animated.View style={[styles.yearPanel, nextYearStyle]}>
            {renderYearGrid(getYear(nextYear))}
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
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  miniMonthContainer: {
    width: "33.33%",
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  miniMonthTitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  miniDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  miniEmptyCell: {
    width: 26,
    height: 24,
  },
  miniDayCell: {
    width: 26,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  miniDayText: {
    fontSize: 13,
  },
});

export default YearView;