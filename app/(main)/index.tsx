import { isSameMonth, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { DayView } from "../../src/components/calendar/DayView";
import { MonthView } from "../../src/components/calendar/MonthView";
import { ScheduleView } from "../../src/components/calendar/ScheduleView";
import { WeekView } from "../../src/components/calendar/WeekView";
import { FloatingMenu } from "../../src/components/common/FloatingMenu";
import { FloatingNavBar } from "../../src/components/common/FloatingNavBar";
import { useViewStore } from "../../src/stores/eventStore";
import { useTheme } from "../../src/stores/themeStore";

export default function MainScreen() {
  const { theme } = useTheme();
  const { currentView, setCurrentView, selectedDate, displayMonth, goToToday } = useViewStore();
  const [activeTab, setActiveTab] = useState<"calendar" | "todo">("calendar");
  const [menuVisible, setMenuVisible] = useState(false);

  // 计算是否显示"今"按钮
  const showTodayButton = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentDisplayMonth = startOfMonth(new Date(displayMonth));
    const todayMonth = startOfMonth(today);

    return selectedDate !== todayStr || !isSameMonth(currentDisplayMonth, todayMonth);
  }, [selectedDate, displayMonth]);

  const handleMenuPress = () => {
    setMenuVisible(!menuVisible);
  };

  const handleAddPress = () => {
    // TODO: Implement add event
  };

  const handleTabChange = (tab: "calendar" | "todo") => {
    setActiveTab(tab);
    if (tab === "calendar") {
      setCurrentView("month");
    } else {
      setCurrentView("events");
    }
  };

  const handleWeekView = () => {
    setCurrentView("week");
    setActiveTab("calendar");
  };

  const handleScheduleView = () => {
    setCurrentView("events");
    setActiveTab("calendar");
  };

  const renderContent = () => {
    switch (currentView) {
      case "month":
        return <MonthView />;
      case "day":
        return <DayView />;
      case "week":
        return <WeekView />;
      case "events":
        return <ScheduleView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Main Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Floating Navigation Bar */}
      <FloatingNavBar
        onMenuPress={handleMenuPress}
        onAddPress={handleAddPress}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        menuOpen={menuVisible}
        onTodayPress={goToToday}
        showTodayButton={showTodayButton}
      />

      {/* Floating Menu */}
      <FloatingMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onWeekView={handleWeekView}
        onScheduleView={handleScheduleView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
