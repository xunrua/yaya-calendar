import { format, getISOWeek, getYear } from "date-fns";
import { zhCN } from "date-fns/locale";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useViewStore } from "../../stores/eventStore";
import { useTheme } from "../../stores/themeStore";

export const CalendarHeader = () => {
  const { theme } = useTheme();
  const { selectedDate, currentView } = useViewStore();
  const insets = useSafeAreaInsets();

  const date = new Date(selectedDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {currentView === "year"
            ? `${getYear(date)}年`
            : format(date, "yyyy年M月", { locale: zhCN })}
        </Text>
        {currentView === "month" && (
          <Text
            style={[styles.weekNumber, { color: theme.colors.textTertiary }]}
          >
            第{getISOWeek(date)}周
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 16,
    marginRight: 16,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginLeft: "5%",
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  weekNumber: {
    fontSize: 14,
    fontWeight: "400",
    marginLeft: 8,
    fontVariant: ["tabular-nums"],
  },
});
