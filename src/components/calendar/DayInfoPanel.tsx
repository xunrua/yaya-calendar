// 日期信息面板组件 - 显示农历详情和事件列表

import { differenceInDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import type React from "react";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getHolidays, getSolarTerm, toLunarDate } from "../../domain/lunar";
import type { Event } from "../../domain/types";
import { useEventStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";

interface DayInfoPanelProps {
  date: string; // ISO 格式日期
}

/**
 * 获取相对日期描述
 */
const getRelativeDateLabel = (date: Date): string => {
  const today = startOfDay(new Date());
  const targetDate = startOfDay(date);

  if (isSameDay(today, targetDate)) {
    return "今天";
  }

  const diff = differenceInDays(targetDate, today);

  if (diff > 0) {
    return `${diff}天后`;
  } else {
    return `${Math.abs(diff)}天前`;
  }
};

/**
 * 日期信息面板 - 显示选中日期的农历详情和事件列表
 */
export const DayInfoPanel: React.FC<DayInfoPanelProps> = ({ date }) => {
  const { theme } = useTheme();
  const getEventsForDate = useEventStore((s) => s.getEventsForDate);

  // 获取当天事件
  const events = useMemo(() => getEventsForDate(date), [date, getEventsForDate]);

  // 获取日期显示信息
  const dateInfo = useMemo(() => {
    const dateObj = parseISO(date);
    const lunar = toLunarDate(dateObj);
    const solarTerm = getSolarTerm(dateObj);
    const holidays = getHolidays(dateObj);

    // 过滤出传统节日和法定假日（排除节气）
    const festivals = holidays.filter((h) => h.type !== "solar_term");

    // 农历信息（不含节日）
    const lunarParts: string[] = [];
    lunarParts.push(lunar.day === 1 ? lunar.monthName : lunar.dayName);
    lunarParts.push(`${lunar.yearGanZhi}(${lunar.yearShengXiao})`);

    if (solarTerm) {
      lunarParts.push(solarTerm.name);
    }

    // 节日信息
    const festivalName = festivals.length > 0 ? festivals[0].name : null;

    return {
      relativeLabel: getRelativeDateLabel(dateObj),
      formattedDate: format(dateObj, "M月d日"),
      lunarInfo: lunarParts.join(" "),
      festival: festivalName,
    };
  }, [date]);

  const hasEvents = events.length > 0;

  return (
    <View style={styles.container}>
      {/* 日期信息区域 */}
      <View style={styles.dateSection}>
        <View style={styles.dateLeft}>
          <Text style={[styles.relativeLabel, { color: theme.colors.primary }]}>
            {dateInfo.relativeLabel}
          </Text>
          <Text style={[styles.formattedDate, { color: theme.colors.text }]}>
            {dateInfo.formattedDate}
          </Text>
        </View>
        <Text style={[styles.lunarInfo, { color: theme.colors.textSecondary }]}>
          {dateInfo.lunarInfo}
        </Text>
      </View>
      {dateInfo.festival && (
        <Text style={[styles.festivalInfo, { color: theme.colors.textSecondary }]}>
          {dateInfo.festival}
        </Text>
      )}

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
        <Text style={[styles.eventTime, { color: theme.colors.textTertiary }]}>{timeRange}</Text>
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
  // 日期信息区域
  dateSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateLeft: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  relativeLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  formattedDate: {
    fontSize: 14,
    fontWeight: "500",
  },
  lunarInfo: {
    fontSize: 12,
  },
  festivalInfo: {
    fontSize: 12,
    marginBottom: 12,
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
  },
  eventDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});

export default DayInfoPanel;
