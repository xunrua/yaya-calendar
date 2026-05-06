import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/stores/themeStore';
import { FloatingNavBar } from '../../src/components/common/FloatingNavBar';
import { FloatingMenu } from '../../src/components/common/FloatingMenu';
import { WeekView } from '../../src/components/calendar/WeekView';
import { ScheduleView } from '../../src/components/calendar/ScheduleView';

type MainView = 'calendar' | 'todo' | 'week' | 'schedule';

export default function MainLayout() {
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

  // Render overlay views (week, schedule) on top of the main content
  const renderOverlay = () => {
    if (currentView === 'week') {
      return (
        <View style={styles.overlay}>
          <WeekView />
        </View>
      );
    }
    if (currentView === 'schedule') {
      return (
        <View style={styles.overlay}>
          <ScheduleView />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Main content from child routes */}
      <View style={styles.content}>
        <Stack.Screen options={{ headerShown: false }} />
        {currentView === 'calendar' || currentView === 'todo' ? (
          <Stack />
        ) : null}
      </View>

      {/* Overlay views */}
      {renderOverlay()}

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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});