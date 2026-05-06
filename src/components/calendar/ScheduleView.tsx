import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../stores/themeStore';
import { useEventStore } from '../../stores/eventStore';
import { format, parseISO, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface ScheduleViewProps {
  selectedDate?: string;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ selectedDate }) => {
  const { theme } = useTheme();
  const { events } = useEventStore();

  // Get all events sorted by start time
  const sortedEvents = React.useMemo(() => {
    const allEvents = Object.values(events).flat();
    return allEvents.sort((a, b) => {
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);

  // Group events by date
  const eventsByDate = React.useMemo(() => {
    const grouped: { [date: string]: typeof sortedEvents } = {};
    sortedEvents.forEach((event) => {
      const dateKey = format(new Date(event.startTime), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [sortedEvents]);

  const sortedDates = Object.keys(eventsByDate).sort();

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm');
  };

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isSameDay(date, today)) {
      return '今天';
    }
    if (isSameDay(date, tomorrow)) {
      return '明天';
    }
    return format(date, 'M月d日 EEEE', { locale: zhCN });
  };

  if (sortedDates.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          暂无日程安排
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {sortedDates.map((date, dateIndex) => (
        <Animated.View
          key={date}
          entering={FadeInUp.delay(dateIndex * 50).springify()}
          exiting={FadeOutDown}
        >
          {/* Date Header */}
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: theme.colors.text }]}>
              {formatDateHeader(date)}
            </Text>
            <Text style={[styles.dateSubText, { color: theme.colors.textTertiary }]}>
              {format(parseISO(date), 'yyyy年M月d日', { locale: zhCN })}
            </Text>
          </View>

          {/* Events for this date */}
          <View style={styles.eventsContainer}>
            {eventsByDate[date].map((event, eventIndex) => (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderLeftColor: event.color || theme.colors.eventDefault,
                  },
                ]}
              >
                <View style={styles.eventTimeContainer}>
                  <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
                    {formatEventTime(event.startTime)}
                  </Text>
                  {event.endTime && (
                    <Text style={[styles.eventTimeEnd, { color: theme.colors.textTertiary }]}>
                      - {formatEventTime(event.endTime)}
                    </Text>
                  )}
                </View>
                <View style={styles.eventContent}>
                  <Text
                    style={[styles.eventTitle, { color: theme.colors.text }]}
                    numberOfLines={2}
                  >
                    {event.title}
                  </Text>
                  {event.description && (
                    <Text
                      style={[styles.eventDescription, { color: theme.colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {event.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      ))}

      {/* Bottom padding for floating nav */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  dateHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  dateHeaderText: {
    fontSize: 20,
    fontWeight: '700',
  },
  dateSubText: {
    fontSize: 13,
    marginTop: 2,
  },
  eventsContainer: {
    paddingHorizontal: 16,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventTimeContainer: {
    width: 60,
    marginRight: 12,
  },
  eventTime: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventTimeEnd: {
    fontSize: 12,
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  bottomPadding: {
    height: 120,
  },
});

export default ScheduleView;