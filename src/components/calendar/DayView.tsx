import { format, isSameDay, parseISO, setHours, setMinutes } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useRouter } from "expo-router";
import type React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getLunarInfo } from "../../domain/lunar";
import type { Event } from "../../domain/types";
import { useEventStore, useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";

const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface EventBlockProps {
  event: Event;
  top: number;
  height: number;
  onPress: () => void;
}

const EventBlock: React.FC<EventBlockProps> = ({ event, top, height, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.eventBlock,
        {
          top,
          height,
          backgroundColor: event.color || theme.colors.eventDefault,
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.eventTitle} numberOfLines={1}>
        {event.title}
      </Text>
      {height > 40 && (
        <Text style={styles.eventTime} numberOfLines={1}>
          {format(parseISO(event.startTime), "HH:mm")} - {format(parseISO(event.endTime), "HH:mm")}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const DayView: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedDate } = useViewStore();
  const { getEventsForDate } = useEventStore();

  const currentDate = parseISO(selectedDate);
  const dayEvents = getEventsForDate(selectedDate);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  const lunarInfo = getLunarInfo(currentDate);

  const getEventPosition = (event: Event) => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = startHour * HOUR_HEIGHT;
    const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 30);

    return { top, height };
  };

  const handleEventPress = (event: Event) => {
    router.push(`/event/${event.id}` as const);
  };

  const handleTimeSlotPress = (hour: number) => {
    const newStartTime = setMinutes(setHours(currentDate, hour), 0);
    // TODO: 跳转创建事件页面
    void newStartTime;
  };

  const renderTimeSlot = (hour: number) => {
    const currentHour = new Date().getHours();
    const isCurrentHour = isToday && hour === currentHour;

    return (
      <TouchableOpacity
        key={hour}
        style={styles.timeSlot}
        onPress={() => handleTimeSlotPress(hour)}
      >
        {/* Time label */}
        <View style={styles.timeLabel}>
          <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
            {hour.toString().padStart(2, "0")}:00
          </Text>
        </View>

        {/* Grid line */}
        <View style={[styles.gridLine, { borderColor: theme.colors.border }]} />

        {/* Current time indicator */}
        {isCurrentHour && (
          <View style={[styles.currentTimeIndicator, { backgroundColor: theme.colors.error }]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEvents = () => {
    return dayEvents.map((event) => {
      const { top, height } = getEventPosition(event);
      return (
        <EventBlock
          key={event.id}
          event={event}
          top={top}
          height={height}
          onPress={() => handleEventPress(event)}
        />
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.dateHeader}>
          <Text style={[styles.dayNumber, { color: theme.colors.text }]}>
            {format(currentDate, "d")}
          </Text>
          <View style={styles.dateInfo}>
            <Text style={[styles.weekday, { color: theme.colors.text }]}>
              {format(currentDate, "EEEE", { locale: zhCN })}
            </Text>
            <Text style={[styles.lunarInfo, { color: theme.colors.textSecondary }]}>
              {lunarInfo.holiday || lunarInfo.solarTerm || lunarInfo.lunarDay}
            </Text>
          </View>
        </View>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.todayText}>今天</Text>
          </View>
        )}
      </View>

      {/* Time grid */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.timeGrid}>
          {/* Time slots */}
          {HOURS.map((hour) => renderTimeSlot(hour))}

          {/* Events overlay */}
          <View style={styles.eventsOverlay}>{renderEvents()}</View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayNumber: {
    fontSize: 48,
    fontWeight: "700",
    marginRight: 12,
  },
  dateInfo: {
    gap: 2,
  },
  weekday: {
    fontSize: 16,
    fontWeight: "500",
  },
  lunarInfo: {
    fontSize: 14,
  },
  todayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  timeGrid: {
    position: "relative",
    paddingTop: 8,
  },
  timeSlot: {
    flexDirection: "row",
    height: HOUR_HEIGHT,
  },
  timeLabel: {
    width: 60,
    paddingRight: 8,
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 12,
  },
  gridLine: {
    flex: 1,
    borderTopWidth: 1,
  },
  currentTimeIndicator: {
    position: "absolute",
    left: 60,
    right: 0,
    top: 0,
    height: 2,
  },
  eventsOverlay: {
    position: "absolute",
    left: 68,
    right: 8,
    top: 8,
  },
  eventBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 8,
    overflow: "hidden",
  },
  eventTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  eventTime: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 2,
  },
});

export default DayView;
