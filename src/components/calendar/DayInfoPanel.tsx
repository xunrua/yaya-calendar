// 日期信息面板组件 - 显示农历详情和事件列表

import { format, parseISO } from "date-fns";
import type React from "react";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Event } from "../../domain/types";
import { getHolidays, getSolarTerm, toLunarDate } from "../../domain/lunar";
import { useEventStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";

interface DayInfoPanelProps {
  date: string; // ISO 格式日期
}

/**
 * 日期信息面板 - 显示选中日期的农历详情和事件列表
 */
export const DayInfoPanel: React.FC<DayInfoPanelProps> = ({ date }) => {
  const { theme } = useTheme();
  const getEventsForDate = useEventStore((s) => s.getEventsForDate);

  // 获取当天事件
  const events = useMemo(() => getEventsForDate(date), [date, getEventsForDate]);

  // 获取农历详情
  const lunarDetails = useMemo(() => {
    const dateObj = parseISO(date);
    const lunar = toLunarDate(dateObj);
    const solarTerm = getSolarTerm(dateObj);
    const holidays = getHolidays(dateObj);

    // 过滤出传统节日和法定假日（排除节气）
    const festivals = holidays.filter((h) => h.type !== "solar_term");

    return {
      lunarDate: lunar.day === 1 ? lunar.monthName : lunar.dayName,
      yearGanZhi: lunar.yearGanZhi,
      shengXiao: lunar.yearShengXiao,
      solarTerm: solarTerm?.name,
      festival: festivals.length > 0 ? festivals[0].name : undefined,
    };
  }, [date]);

  const hasEvents = events.length > 0;

  return (
    <View style={styles.container}>
      {/* 农历详情区域 */}
      <View style={styles.lunarSection}>
        <View style={styles.lunarRow}>
          <Text style={[styles.lunarDate, { color: theme.colors.text }]}>
            {lunarDetails.lunarDate}
          </Text>
          <Text style={[styles.ganZhi, { color: theme.colors.textSecondary }]}>
            {lunarDetails.yearGanZhi}({lunarDetails.shengXiao})
          </Text>
        </View>
        {(lunarDetails.solarTerm || lunarDetails.festival) && (
          <View style={styles.lunarRow}>
            {lunarDetails.solarTerm && (
              <Text style={[styles.solarTerm, { color: theme.colors.solarTermText }]}>
                节气: {lunarDetails.solarTerm}
              </Text>
            )}
            {lunarDetails.festival && (
              <Text style={[styles.festival, { color: theme.colors.holidayText }]}>
                {lunarDetails.solarTerm ? "  " : ""}
                节日: {lunarDetails.festival}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* 事件列表区域 */}
      {hasEvents && (
        <ScrollView
          style={styles.eventsSection}
          contentContainerStyle={styles.eventsContent}
          showsVerticalScrollIndicator={false}
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

/**
 * 事件卡片组件
 */
const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  const { theme } = useTheme();

  // 解析时间
  const timeRange = useMemo(() => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    return `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;
  }, [event.startTime, event.endTime]);

  return (
    <View style={[styles.eventCard, { backgroundColor: theme.colors.surface }]}>
      {/* 左侧颜色条 */}
      <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />

      {/* 事件内容 */}
      <View style={styles.eventContent}>
        <Text style={[styles.eventTime, { color: theme.colors.textTertiary }]}>
          {timeRange}
        </Text>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // 农历详情区域
  lunarSection: {
    marginBottom: 12,
  },
  lunarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  lunarDate: {
    fontSize: 14,
    fontWeight: "500",
  },
  ganZhi: {
    fontSize: 12,
    marginLeft: 12,
  },
  solarTerm: {
    fontSize: 12,
  },
  festival: {
    fontSize: 12,
  },
  // 事件列表区域
  eventsSection: {
    maxHeight: 200,
  },
  eventsContent: {
    paddingBottom: 8,
  },
  // 事件卡片
  eventCard: {
    flexDirection: "row",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 10,
  },
  eventTime: {
    fontSize: 11,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default DayInfoPanel;
