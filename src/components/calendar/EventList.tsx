import React from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../stores/themeStore';
import { useEventStore } from '../../stores/eventStore';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getLunarInfo } from '../../domain/lunar';
import { Event } from '../../domain/types';

interface EventItemProps {
  event: Event;
  onPress: () => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.eventItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.eventColor, { backgroundColor: event.color || theme.colors.eventDefault }]} />
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
          {format(parseISO(event.startTime), 'HH:mm')} - {format(parseISO(event.endTime), 'HH:mm')}
        </Text>
        {event.description && (
          <Text style={[styles.eventDesc, { color: theme.colors.textTertiary }]} numberOfLines={2}>
            {event.description}
          </Text>
        )}
      </View>
      {event.recurrenceRule && (
        <View style={styles.recurrenceBadge}>
          <Text style={styles.recurrenceIcon}>↻</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const getDateSectionTitle = (date: Date): string => {
  if (isToday(date)) return '今天';
  if (isTomorrow(date)) return '明天';
  return format(date, 'M月d日 EEEE', { locale: zhCN });
};

export const EventList: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { events } = useEventStore();

  // Group events by date
  const eventMap = new Map<string, Event[]>();
  events.forEach((event) => {
    const dateKey = format(parseISO(event.startTime), 'yyyy-MM-dd');
    const existing = eventMap.get(dateKey) ?? [];
    existing.push(event);
    eventMap.set(dateKey, existing);
  });

  // Sort dates and create sections
  const sortedDates = [...eventMap.keys()].sort();
  const sections = sortedDates.map((dateKey) => ({
    title: dateKey,
    data: eventMap.get(dateKey)!.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const renderSectionHeader = ({ section }: { section: { title: string; data: Event[] } }) => {
    const date = parseISO(section.title);
    const lunarInfo = getLunarInfo(date);
    const lunarText = lunarInfo.holiday || lunarInfo.solarTerm || lunarInfo.lunarDay;

    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionDate, { color: theme.colors.text }]}>
            {getDateSectionTitle(date)}
          </Text>
          <Text style={[styles.sectionLunar, { color: theme.colors.textSecondary }]}>
            {lunarText}
          </Text>
        </View>
        <Text style={[styles.sectionCount, { color: theme.colors.textTertiary }]}>
          {section.data.length} 个事件
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            暂无事件
          </Text>
          <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
            点击日历中的日期创建新事件
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventItem event={item} onPress={() => router.push(`/event/${item.id}` as const)} />
          )}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLunar: {
    fontSize: 12,
  },
  sectionCount: {
    fontSize: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  eventColor: {
    width: 4,
    height: '100%',
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 13,
    marginTop: 2,
  },
  eventDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  recurrenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  recurrenceIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default EventList;