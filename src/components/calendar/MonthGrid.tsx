import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
} from "date-fns";
import { getLunarInfo } from "../../domain/lunar";
import { getWorkStatus } from "../../utils/workSchedule";
import { useEventStore, useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";

type Fidelity = "full" | "skeleton";

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed (0=January)
  fidelity?: Fidelity;
}

export default function MonthGrid({
  year,
  month,
  fidelity = "full",
}: MonthGridProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const selectedDate = useViewStore((state) => state.selectedDate);
  const setSelectedDate = useViewStore((state) => state.setSelectedDate);
  const { getEventsForDate } = useEventStore();

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
    const dayOfWeek = day.getDay();

    if (!isCurrentMonth) {
      return (
        <View key={dateStr} style={styles.dayCell}>
          <View style={styles.dayNumberContainer}>
            <Text style={[styles.dayNumber, { color: c.textTertiary }]}>
              {format(day, "d")}
            </Text>
          </View>
        </View>
      );
    }

    const lunarInfo = fidelity === "full" ? getLunarInfo(day) : null;
    const events = fidelity === "full" ? getEventsForDate(dateStr) : [];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const workStatus = fidelity === "full" ? getWorkStatus(day) : null;

    return (
      <Pressable
        key={dateStr}
        onPress={() => handleDayPress(day)}
        style={styles.dayCell}
      >
        <View style={styles.dayNumberWrapper}>
          <View
            style={[
              styles.dayNumberContainer,
              {
                backgroundColor: isSelectedDate
                  ? c.selectedBackground
                  : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                {
                  color: !isCurrentMonth
                    ? c.textTertiary
                    : isWeekend
                      ? c.weekendText
                      : isSelectedDate
                        ? c.selectedText
                        : c.text,
                },
              ]}
            >
              {format(day, "d")}
            </Text>
          </View>
          {workStatus && (
            <Text
              style={[
                styles.workStatusText,
                {
                  color: workStatus === "班" ? c.textTertiary : "#60A5FA",
                },
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
              {
                color: !isCurrentMonth
                  ? c.textTertiary
                  : lunarInfo.isHoliday
                    ? c.holidayText
                    : lunarInfo.isSolarTerm
                      ? c.solarTermText
                      : c.lunarText,
              },
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
                  { backgroundColor: event.color || c.eventDefault },
                ]}
              />
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.daysGrid}>
      {calendarDays.map((day) => renderDayCell(day))}
    </View>
  );
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
