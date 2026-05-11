// 月网格组件

import {
  isToday as checkIsToday,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { getLunarInfo } from "../../domain/lunar";
import { useEventStore, useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";
import { calculateSingleRowHeight } from "../../utils/calendar";
import { getWorkStatus } from "../../utils/workSchedule";

const PRIMARY_COLOR = "#E8563A"; // 主题强调色
const POP_ANIMATION_CONFIG = { damping: 18, stiffness: 200 };

type Fidelity = "full" | "skeleton";

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed（0 = 一月）
  fidelity?: Fidelity;
  targetRowIndex?: number; // 目标行索引（用于折叠动画）
  foldProgress?: SharedValue<number>; // 折叠进度（0-1）
  screenWidth?: number; // 屏幕宽度（用于计算折叠高度）
}

interface AnimatedDayCellProps {
  day: Date;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  fidelity: Fidelity;
  isDimmed?: boolean; // 是否淡化显示（非当月日期）
  onPress?: () => void;
}

const AnimatedDayCell: React.FC<AnimatedDayCellProps> = ({
  day,
  isSelected,
  isToday,
  isCurrentMonth,
  isWeekend,
  fidelity,
  isDimmed = false,
  onPress,
}) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const scale = useSharedValue(1);
  const prevSelected = useSharedValue(false);

  useEffect(() => {
    if (isSelected && !prevSelected.value) {
      scale.value = withSpring(1.15, POP_ANIMATION_CONFIG);
      setTimeout(() => {
        scale.value = withSpring(1, POP_ANIMATION_CONFIG);
      }, 100);
    }
    prevSelected.value = isSelected;
  }, [isSelected, scale, prevSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dateStr = format(day, "yyyy-MM-dd");
  const lunarInfo = fidelity === "full" ? getLunarInfo(day) : null;
  const events = fidelity === "full" ? useEventStore.getState().getEventsForDate(dateStr) : [];
  const workStatus = fidelity === "full" ? getWorkStatus(day) : null;

  const getBackgroundColor = () => {
    if (isDimmed) return "transparent";
    // 只有选中今天时才显示背景高亮
    if (isToday && isSelected) return PRIMARY_COLOR;
    return "transparent";
  };

  const getTextColor = () => {
    if (isDimmed) return c.textTertiary;
    if (!isCurrentMonth) return c.textTertiary;
    // 选中今天时白色
    if (isToday && isSelected) return "#FFFFFF";
    // 今天未选中时普通颜色
    if (isToday) return c.text;
    // 其他日期选中时显示选中颜色
    if (isSelected) return PRIMARY_COLOR;
    if (isWeekend) return c.weekendText;
    return c.text;
  };

  const getBorderColor = () => {
    if (isDimmed) return "transparent";
    // 选中非今天的日期时显示边框
    if (isSelected && !isToday) return PRIMARY_COLOR;
    return "transparent";
  };

  const getLunarColor = () => {
    if (isDimmed) return c.textTertiary;
    if (!isCurrentMonth) return c.textTertiary;
    if (lunarInfo?.isHoliday) return c.holidayText;
    if (lunarInfo?.isSolarTerm) return c.solarTermText;
    return c.lunarText;
  };

  const cellContent = (
    <>
      <View style={styles.dayNumberWrapper}>
        <Animated.View
          style={[
            styles.dayNumberContainer,
            animatedStyle,
            {
              backgroundColor: getBackgroundColor(),
              borderWidth: isSelected && !isToday && !isDimmed ? 1.5 : 0,
              borderColor: getBorderColor(),
            },
          ]}
        >
          <Text style={[styles.dayNumber, { color: getTextColor() }]}>{format(day, "d")}</Text>
        </Animated.View>
        {workStatus && (
          <Text
            style={[
              styles.workStatusText,
              {
                color: isDimmed ? c.textTertiary : workStatus === "班" ? c.textTertiary : "#60A5FA",
              },
            ]}
          >
            {workStatus}
          </Text>
        )}
      </View>
      {fidelity === "full" && lunarInfo && (
        <Text style={[styles.lunarText, { color: getLunarColor() }]} numberOfLines={1}>
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
                { backgroundColor: isDimmed ? c.textTertiary : event.color || c.eventDefault },
              ]}
            />
          ))}
        </View>
      )}
    </>
  );

  // 非当月日期（isDimmed）不可交互
  if (isDimmed || !onPress) {
    return <View style={styles.dayCell}>{cellContent}</View>;
  }

  return (
    <Pressable onPress={onPress} style={styles.dayCell}>
      {cellContent}
    </Pressable>
  );
};

export default function MonthGrid({
  year,
  month,
  fidelity = "full",
  targetRowIndex,
  foldProgress,
  screenWidth = 400,
}: MonthGridProps) {
  const selectedDate = useViewStore((state) => state.selectedDate);
  const setSelectedDate = useViewStore((state) => state.setSelectedDate);

  const calendarDays = useMemo(() => {
    const monthDate = new Date(year, month, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [year, month]);

  // 按行分割日历数据
  const { upperRows, targetRow, lowerRows } = useMemo(() => {
    if (targetRowIndex === undefined || !foldProgress) {
      return { upperRows: calendarDays, targetRow: null, lowerRows: [] };
    }
    const rows: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return {
      upperRows: rows.slice(0, targetRowIndex),
      targetRow: rows[targetRowIndex] || null,
      lowerRows: rows.slice(targetRowIndex + 1),
    };
  }, [calendarDays, targetRowIndex, foldProgress]);

  // 计算各区域高度
  const singleRowHeight = useMemo(() => calculateSingleRowHeight(screenWidth), [screenWidth]);
  const upperHeight = upperRows.length * singleRowHeight;
  const lowerHeight = lowerRows.length * singleRowHeight;
  const targetRowOffset = (targetRowIndex ?? 0) * singleRowHeight;

  // 上方区域动画样式
  const upperStyle = useAnimatedStyle(() => {
    if (!foldProgress) return {};
    const progress = foldProgress.value;
    return {
      opacity: 1 - progress,
      transform: [{ translateY: -progress * upperHeight }],
    };
  });

  // 目标行动画样式
  const targetStyle = useAnimatedStyle(() => {
    if (!foldProgress) return {};
    return {
      transform: [{ translateY: -foldProgress.value * targetRowOffset }],
    };
  });

  // 下方区域动画样式
  const lowerStyle = useAnimatedStyle(() => {
    if (!foldProgress) return {};
    const progress = foldProgress.value;
    return {
      opacity: 1 - progress,
      transform: [{ translateY: -progress * targetRowOffset }],
    };
  });

  const handleDayPress = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setSelectedDate(dateStr);
  };

  const renderDayCell = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isCurrentMonth = isSameMonth(day, new Date(year, month, 1));
    const isSelectedDate = selectedDate === dateStr;
    const isToday = checkIsToday(day);
    const dayOfWeek = day.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return (
      <AnimatedDayCell
        key={dateStr}
        day={day}
        isSelected={isSelectedDate}
        isToday={isToday}
        isCurrentMonth={isCurrentMonth}
        isWeekend={isWeekend}
        fidelity={fidelity}
        isDimmed={!isCurrentMonth}
        onPress={isCurrentMonth ? () => handleDayPress(day) : undefined}
      />
    );
  };

  // 无折叠动画时，使用原有渲染方式
  if (!foldProgress || targetRowIndex === undefined) {
    return <View style={styles.daysGrid}>{calendarDays.map(renderDayCell)}</View>;
  }

  // 有折叠动画时，分区域渲染
  return (
    <View style={styles.daysGridFold}>
      {/* 上方区域 */}
      {upperRows.length > 0 && (
        <Animated.View style={[styles.rowContainer, { height: upperHeight }, upperStyle]}>
          {upperRows.flat().map(renderDayCell)}
        </Animated.View>
      )}

      {/* 目标行 */}
      {targetRow && (
        <Animated.View style={[styles.rowContainer, { height: singleRowHeight }, targetStyle]}>
          {targetRow.map(renderDayCell)}
        </Animated.View>
      )}

      {/* 下方区域 */}
      {lowerRows.length > 0 && (
        <Animated.View style={[styles.rowContainer, { height: lowerHeight }, lowerStyle]}>
          {lowerRows.flat().map(renderDayCell)}
        </Animated.View>
      )}
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
  daysGridFold: {
    flexDirection: "column",
    margin: 0,
    padding: 0,
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
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
