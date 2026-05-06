import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/stores/themeStore';
import { useEventStore } from '../../src/stores/eventStore';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Event } from '../../src/domain/types';

const EventItem: React.FC<{ event: Event; onPress: () => void }> = ({ event, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.eventItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
    >
      <View style={[styles.eventColor, { backgroundColor: event.color || theme.colors.eventDefault }]} />
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
        <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
          {format(parseISO(event.startTime), 'MM月dd日 HH:mm', { locale: zhCN })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function EventsScreen() {
  const { theme } = useTheme();
  const { events } = useEventStore();

  const sortedEvents = [...events].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {sortedEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            暂无事件
          </Text>
          <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
            点击日历中的日期创建新事件
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventItem event={item} onPress={() => console.log('Event pressed:', item.id)} />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  eventItem: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  eventColor: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
  },
});