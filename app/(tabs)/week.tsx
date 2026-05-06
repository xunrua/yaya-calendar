import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/stores/themeStore';

export default function WeekScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>周视图</Text>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        即将实现...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
  },
  hint: {
    fontSize: 16,
    marginTop: 8,
  },
});