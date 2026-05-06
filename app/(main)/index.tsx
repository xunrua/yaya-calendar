import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../src/stores/themeStore';
import { MonthView } from '../../src/components/calendar/MonthView';

export default function MainIndex() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MonthView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});