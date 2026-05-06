import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/stores/themeStore';
import { useEventStore } from '../../src/stores/eventStore';
import { FloatingNavBar } from '../../src/components/common/FloatingNavBar';
import { FloatingMenu } from '../../src/components/common/FloatingMenu';
import { MonthView } from '../../src/components/calendar/MonthView';
import { WeekView } from '../../src/components/calendar/WeekView';
import { ScheduleView } from '../../src/components/calendar/ScheduleView';
import EventsScreen from '../(tabs)/events';

type MainView = 'calendar' | 'todo' | 'week' | 'schedule';

function MainContent() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'calendar' | 'todo'>('calendar');
  const [currentView, setCurrentView] = useState<MainView>('calendar');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = () => {
    setMenuVisible(!menuVisible);
  };

  const handleAddPress = () => {
    // TODO: Implement add event
  };

  const handleTabChange = (tab: 'calendar' | 'todo') => {
    setActiveTab(tab);
    setCurrentView(tab);
  };

  const handleWeekView = () => {
    setCurrentView('week');
    setActiveTab('calendar');
  };

  const handleScheduleView = () => {
    setCurrentView('schedule');
    setActiveTab('calendar');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'calendar':
        return <MonthView />;
      case 'todo':
        return <EventsScreen />;
      case 'week':
        return <WeekView />;
      case 'schedule':
        return <ScheduleView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

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

export default function MainLayout() {
  const { loadEvents } = useEventStore();

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return <MainContent />;
}