import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { getLunarInfo } from "../../domain/lunar";
import { useEventStore, useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";

type Fidelity = "full" | "skeleton";

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed (0=January)
  fidelity?: Fidelity;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export default function MonthGrid({
  year,
  month,
  fidelity = "full",
}: MonthGridProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { selectedDate, setSelectedDate, setCurrentView } = useViewStore();
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
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setCurrentView("day");
  };

  const renderDayCell = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isCurrentMonth = isSameMonth(day, new Date(year, month, 1));
    const isSelected = selectedDate === dateStr;
    const isTodayDate = isToday(day);
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

    return (
      <Pressable
        key={dateStr}
        onPress={() => handleDayPress(day)}
        style={styles.dayCell}
      >
        <View
          style={[
            styles.dayNumberContainer,
            {
              backgroundColor: isTodayDate
                ? c.todayBackground
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
                    : isTodayDate
                      ? c.todayText
                      : c.text,
              },
            ]}
          >
            {format(day, "d")}
          </Text>
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
    <View style={styles.gridContainer}>
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, idx) => (
          <Text
            key={day}
            style={[
              styles.weekdayText,
              { color: idx >= 5 ? c.weekendText : c.textTertiary },
            ]}
          >
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {calendarDays.map((day) => renderDayCell(day))}
      </View>
    </View>
  );
}

const styles = {
  gridContainer: {
    flex: 1,
  } as any,
  weekdayHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    paddingVertical: 8,
  } as any,
  weekdayText: {
    fontSize: 12,
    textAlign: "center" as const,
    width: "14.28%",
  } as any,
  daysGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  } as any,
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 2,
  } as any,
  dayNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  } as any,
  dayNumber: {
    fontSize: 14,
    textAlign: "center" as const,
  } as any,
  lunarText: {
    fontSize: 8,
    textAlign: "center" as const,
    marginTop: 1,
  } as any,
  eventDots: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    marginTop: 2,
    gap: 2,
  } as any,
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  } as any,
};
