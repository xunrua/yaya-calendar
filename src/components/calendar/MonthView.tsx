import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../stores/themeStore';
import { useViewStore, useEventStore } from '../../stores/eventStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getLunarInfo } from '../../domain/lunar';

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

export const MonthView: React.FC = () => {
  const { theme } = useTheme();
  const { selectedDate, setSelectedDate, setCurrentView } = useViewStore();
  const { getEventsForDate } = useEventStore();

  const currentMonth = new Date(selectedDate);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get calendar days (including days from previous/next month to fill the grid)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const today = new Date();

  const handleDayPress = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setCurrentView('day');
  };

  const renderWeekdayHeader = () => (
    <View style={styles.weekdayHeader}>
      {WEEKDAY_NAMES.map((name, index) => (
        <Text
          key={index}
          style={[
            styles.weekdayText,
            {
              color: index === 0 || index === 6
                ? theme.colors.weekendText
                : theme.colors.textSecondary,
            },
          ]}
        >
          {name}
        </Text>
      ))}
    </View>
  );

  const renderDay = (date: Date) => {
    const isToday = isSameDay(date, today);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isWeekend = getDay(date) === 0 || getDay(date) === 6;

    const lunarInfo = getLunarInfo(date);
    const dayEvents = getEventsForDate(format(date, 'yyyy-MM-dd'));

    // Determine lunar text to display
    const lunarText = lunarInfo.holiday || lunarInfo.solarTerm || lunarInfo.lunarDay;

    // Determine text colors
    const lunarTextColor = lunarInfo.isHoliday
      ? theme.colors.holidayText
      : lunarInfo.isSolarTerm
        ? theme.colors.solarTermText
        : theme.colors.lunarText;

    return (
      <TouchableOpacity
        key={format(date, 'yyyy-MM-dd')}
        style={styles.dayCell}
        onPress={() => handleDayPress(date)}
      >
        {/* Day number with pill background for today */}
        <View
          style={[
            styles.dayNumberContainer,
            {
              backgroundColor: isToday
                ? theme.colors.todayBackground
                : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.dayNumber,
              {
                color: !isCurrentMonth
                  ? theme.colors.textTertiary
                  : isWeekend
                    ? theme.colors.weekendText
                    : isToday
                      ? theme.colors.todayText
                      : theme.colors.text,
              },
            ]}
          >
            {format(date, 'd')}
          </Text>
        </View>

        {/* Lunar info */}
        <Text
          style={[
            styles.lunarText,
            { color: isCurrentMonth ? lunarTextColor : theme.colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {lunarText}
        </Text>

        {/* Event indicators */}
        {dayEvents.length > 0 && (
          <View style={styles.eventIndicators}>
            {dayEvents.slice(0, 3).map((event, index) => (
              <View
                key={index}
                style={[
                  styles.eventDot,
                  { backgroundColor: event.color || theme.colors.eventDefault },
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMonthGrid = () => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    calendarDays.forEach((day, index) => {
      currentWeek.push(day);
      if (index % 7 === 6 || index === calendarDays.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeks.map((week, weekIndex) => (
      <View key={weekIndex} style={styles.weekRow}>
        {week.map((day) => renderDay(day))}
      </View>
    ));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </Text>
      </View>

      {/* Weekday header */}
      {renderWeekdayHeader()}

      {/* Month grid */}
      <View style={styles.monthGrid}>{renderMonthGrid()}</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  monthGrid: {
    paddingHorizontal: 12,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  dayNumberContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999, // Pill shape
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  lunarText: {
    fontSize: 9,
    marginTop: 2,
  },
  eventIndicators: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default MonthView;