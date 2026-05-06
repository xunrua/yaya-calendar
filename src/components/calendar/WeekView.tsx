import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../stores/themeStore';
import { useViewStore, useEventStore } from '../../stores/eventStore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getLunarInfo } from '../../domain/lunar';
import { Event } from '../../domain/types';

const HOUR_HEIGHT = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const WeekView: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedDate, setSelectedDate, setCurrentView } = useViewStore();
  const { getEventsForDateRange } = useEventStore();

  const currentDate = parseISO(selectedDate);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const today = new Date();

  // Get events for the week
  const eventsMap = getEventsForDateRange(weekStart, addDays(weekEnd, 1));

  const handleDayPress = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setCurrentView('day');
  };

  const getEventPosition = (event: Event) => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const top = startHour * HOUR_HEIGHT;
    const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 20);

    return { top, height };
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          const lunarInfo = getLunarInfo(day);

          return (
            <TouchableOpacity
              key={format(day, 'yyyy-MM-dd')}
              style={[styles.dayHeader, isToday && { backgroundColor: theme.colors.todayBackground }]}
              onPress={() => handleDayPress(day)}
            >
              <Text style={[styles.weekdayText, { color: theme.colors.textSecondary }]}>
                {format(day, 'EEE', { locale: zhCN })}
              </Text>
              <Text style={[
                styles.dayNumber,
                { color: isToday ? theme.colors.todayText : theme.colors.text },
                isToday && styles.todayNumber,
              ]}>
                {format(day, 'd')}
              </Text>
              <Text style={[styles.lunarText, { color: theme.colors.lunarText }]}>
                {lunarInfo.holiday || lunarInfo.solarTerm || lunarInfo.lunarDay}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTimeGrid = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.timeGrid}>
        {/* Time labels column */}
        <View style={styles.timeLabelsColumn}>
          {HOURS.map((hour) => (
            <View key={hour} style={[styles.timeSlot, { height: HOUR_HEIGHT }]}>
              <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                {hour.toString().padStart(2, '0')}
              </Text>
            </View>
          ))}
        </View>

        {/* Day columns */}
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsMap.get(dateStr) ?? [];

          return (
            <View key={dateStr} style={[styles.dayColumn, { borderColor: theme.colors.border }]}>
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <View key={hour} style={[styles.hourLine, { height: HOUR_HEIGHT, borderColor: theme.colors.border }]} />
              ))}

              {/* Events */}
              {dayEvents.map((event) => {
                const { top, height } = getEventPosition(event);
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventBlock,
                      {
                        top,
                        height,
                        backgroundColor: event.color || theme.colors.eventDefault,
                      },
                    ]}
                    onPress={() => router.push(`/event/${event.id}` as const)}
                  >
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Week title */}
      <View style={styles.weekTitle}>
        <Text style={[styles.weekTitleText, { color: theme.colors.text }]}>
          {format(weekStart, 'M月d日', { locale: zhCN })} - {format(weekEnd, 'M月d日', { locale: zhCN })}
        </Text>
      </View>

      {/* Header with day names */}
      {renderHeader()}

      {/* Time grid */}
      {renderTimeGrid()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekTitle: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  weekTitleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  weekdayText: {
    fontSize: 12,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  todayNumber: {
    fontWeight: '700',
  },
  lunarText: {
    fontSize: 10,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
  },
  timeLabelsColumn: {
    width: 30,
  },
  timeSlot: {
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  timeLabel: {
    fontSize: 10,
  },
  dayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    position: 'relative',
  },
  hourLine: {
    borderBottomWidth: 1,
  },
  eventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
    overflow: 'hidden',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default WeekView;