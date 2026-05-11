import {
  isToday as checkIsToday,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { getLunarInfo } from "../../domain/lunar";
import { useEventStore, useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import { getWorkStatus } from "../../utils/workSchedule";

const PRIMARY_COLOR = "#E8563A";
const POP_ANIMATION_CONFIG = { damping: 18, stiffness: 200 };

type Fidelity = "full" | "skeleton";

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed (0=January)
  fidelity?: Fidelity;
}

interface AnimatedDayCellProps {
  day: Date;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  fidelity: Fidelity;
  isDimmed?: boolean;
  onPress?: () => void;
}

const AnimatedDayCell: React.FC<AnimatedDayCellProps> = ({
  day,
  isSelected,
  isToday,
  isCurrentMonth,
  isWeekend,
  fidelity,
  isDimmed = false,
  onPress,
}) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const scale = useSharedValue(1);
  const prevSelected = useSharedValue(false);

  useEffect(() => {
    if (isSelected && !prevSelected.value) {
      scale.value = withSpring(1.15, POP_ANIMATION_CONFIG);
      setTimeout(() => {
        scale.value = withSpring(1, POP_ANIMATION_CONFIG);
      }, 100);
    }
    prevSelected.value = isSelected;
  }, [isSelected, scale, prevSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dateStr = format(day, "yyyy-MM-dd");
  const lunarInfo = fidelity === "full" ? getLunarInfo(day) : null;
  const events = fidelity === "full" ? useEventStore.getState().getEventsForDate(dateStr) : [];
  const workStatus = fidelity === "full" ? getWorkStatus(day) : null;

  const getBackgroundColor = () => {
    if (isDimmed) return "transparent";
    if (isToday) return PRIMARY_COLOR;
    if (isSelected) return "transparent";
    return "transparent";
  };

  const getTextColor = () => {
    if (isDimmed) return c.textTertiary;
    if (!isCurrentMonth) return c.textTertiary;
    if (isToday) return "#FFFFFF";
    if (isSelected) return PRIMARY_COLOR;
    if (isWeekend) return c.weekendText;
    return c.text;
  };

  const getBorderColor = () => {
    if (isDimmed) return "transparent";
    if (isSelected && !isToday) return PRIMARY_COLOR;
    return "transparent";
  };

  const getLunarColor = () => {
    if (isDimmed) return c.textTertiary;
    if (!isCurrentMonth) return c.textTertiary;
    if (lunarInfo?.isHoliday) return c.holidayText;
    if (lunarInfo?.isSolarTerm) return c.solarTermText;
    return c.lunarText;
  };

  const cellContent = (
    <>
      <View style={styles.dayNumberWrapper}>
        <Animated.View
          style={[
            styles.dayNumberContainer,
            animatedStyle,
            {
              backgroundColor: getBackgroundColor(),
              borderWidth: isSelected && !isToday && !isDimmed ? 1.5 : 0,
              borderColor: getBorderColor(),
            },
          ]}
        >
          <Text style={[styles.dayNumber, { color: getTextColor() }]}>{format(day, "d")}</Text>
        </Animated.View>
        {workStatus && (
          <Text
            style={[
              styles.workStatusText,
              { color: isDimmed ? c.textTertiary : workStatus === "班" ? c.textTertiary : "#60A5FA" },
            ]}
          >
            {workStatus}
          </Text>
        )}
      </View>
      {fidelity === "full" && lunarInfo && (
        <Text
          style={[
            styles.lunarText,
            { color: getLunarColor() },
          ]}
          numberOfLines={1}
        >
          {lunarInfo.holiday || lunarInfo.solarTerm || lunarInfo.lunarDay}
        </Text>
      )}
      {fidelity === "full" && events.length > 0 && (
        <View style={styles.eventDots}>
          {events.slice(0, 3).map((event) => (
            <View
              key={event.id}
              style={[
                styles.eventDot,
                { backgroundColor: isDimmed ? c.textTertiary : event.color || c.eventDefault },
              ]}
            />
          ))}
        </View>
      )}
    </>
  );

  // 非当月日期（isDimmed）不可交互
  if (isDimmed || !onPress) {
    return <View style={styles.dayCell}>{cellContent}</View>;
  }

  return (
    <Pressable onPress={onPress} style={styles.dayCell}>
      {cellContent}
    </Pressable>
  );
};

export default function MonthGrid({ year, month, fidelity = "full" }: MonthGridProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const selectedDate = useViewStore((state) => state.selectedDate);
  const setSelectedDate = useViewStore((state) => state.setSelectedDate);

  const calendarDays = useMemo(() => {
    const monthDate = new Date(year, month, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [year, month]);

  const handleDayPress = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setSelectedDate(dateStr);
  };

  const renderDayCell = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isCurrentMonth = isSameMonth(day, new Date(year, month, 1));
    const isSelectedDate = selectedDate === dateStr;
    const isToday = checkIsToday(day);
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return (
      <AnimatedDayCell
        key={dateStr}
        day={day}
        isSelected={isSelectedDate}
        isToday={isToday}
        isCurrentMonth={isCurrentMonth}
        isWeekend={isWeekend}
        fidelity={fidelity}
        isDimmed={!isCurrentMonth}
        onPress={isCurrentMonth ? () => handleDayPress(day) : undefined}
      />
    );
  };

  return <View style={styles.daysGrid}>{calendarDays.map((day) => renderDayCell(day))}</View>;
}

const styles = StyleSheet.create({
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    margin: 0,
    padding: 0,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  dayNumberWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 14,
    textAlign: "center",
  },
  workStatusText: {
    position: "absolute",
    top: -4,
    right: -8,
    fontSize: 8,
    fontWeight: "500",
  },
  lunarText: {
    fontSize: 8,
    textAlign: "center",
    marginTop: 1,
  },
  eventDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 2,
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
