import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../src/stores/themeStore';
import { useViewStore } from '../../src/stores/eventStore';
import { FloatingNavBar } from '../../src/components/common/FloatingNavBar';
import { FloatingMenu } from '../../src/components/common/FloatingMenu';
import { MonthView } from '../../src/components/calendar/MonthView';
import { WeekView } from '../../src/components/calendar/WeekView';
import { ScheduleView } from '../../src/components/calendar/ScheduleView';
import { DayView } from '../../src/components/calendar/DayView';

export default function MainScreen() {
  const { theme } = useTheme();
  const { currentView, setCurrentView } = useViewStore();
  const [activeTab, setActiveTab] = useState<'calendar' | 'todo'>('calendar');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = () => {
    setMenuVisible(!menuVisible);
  };

  const handleAddPress = () => {
    // TODO: Implement add event
  };

  const handleTabChange = (tab: 'calendar' | 'todo') => {
    setActiveTab(tab);
    if (tab === 'calendar') {
      setCurrentView('month');
    } else {
      setCurrentView('events');
    }
  };

  const handleWeekView = () => {
    setCurrentView('week');
    setActiveTab('calendar');
  };

  const handleScheduleView = () => {
    setCurrentView('events');
    setActiveTab('calendar');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'month':
        return <MonthView />;
      case 'day':
        return <DayView />;
      case 'week':
        return <WeekView />;
      case 'events':
        return <ScheduleView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Main Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Floating Navigation Bar */}
      <FloatingNavBar
        onMenuPress={handleMenuPress}
        onAddPress={handleAddPress}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        menuOpen={menuVisible}
      />

      {/* Floating Menu */}
      <FloatingMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onThemeToggle={() => {}}
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