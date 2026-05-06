import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../stores/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingNavBarProps {
  onMenuPress: () => void;
  onAddPress: () => void;
  activeTab: 'calendar' | 'todo';
  onTabChange: (tab: 'calendar' | 'todo') => void;
  menuOpen?: boolean;
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  onMenuPress,
  onAddPress,
  activeTab,
  onTabChange,
  menuOpen = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values for segmented control
  const indicatorPosition = useSharedValue(activeTab === 'calendar' ? 0 : 1);

  React.useEffect(() => {
    indicatorPosition.value = withSpring(activeTab === 'calendar' ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [activeTab, indicatorPosition]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = 70;
    const gap = 8;
    const totalOffset = indicatorPosition.value * (segmentWidth + gap);
    return {
      transform: [{ translateX: totalOffset }],
    };
  });

  const handleTabPress = (tab: 'calendar' | 'todo') => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  const handleMenuPress = () => {
    onMenuPress();
  };

  const renderGlassBackground = () => {
    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            styles.webGlass,
            {
              backgroundColor: theme.mode === 'dark'
                ? 'rgba(44, 44, 46, 0.85)'
                : 'rgba(250, 250, 250, 0.85)',
              borderColor: theme.colors.border,
            },
          ]}
        />
      );
    }

    return (
      <BlurView
        intensity={40}
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        style={[
          styles.glass,
          {
            backgroundColor: theme.mode === 'dark'
              ? 'rgba(44, 44, 46, 0.7)'
              : 'rgba(250, 250, 250, 0.7)',
            borderColor: theme.colors.border,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {renderGlassBackground()}

      <View style={styles.content}>
        {/* Menu Button */}
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor: theme.mode === 'dark'
                ? 'rgba(58, 58, 60, 0.8)'
                : 'rgba(235, 235, 235, 0.8)',
            },
          ]}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={menuOpen ? 'close' : 'menu'}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        {/* Segmented Control */}
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor: theme.mode === 'dark'
                ? 'rgba(58, 58, 60, 0.6)'
                : 'rgba(235, 235, 235, 0.6)',
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Sliding Indicator */}
          <Animated.View
            style={[
              styles.segmentedIndicator,
              {
                backgroundColor: theme.colors.primary,
              },
              animatedIndicatorStyle,
            ]}
          />

          {/* Calendar Tab */}
          <TouchableOpacity
            style={styles.segment}
            onPress={() => handleTabPress('calendar')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'calendar'
                    ? theme.mode === 'dark' ? '#1C1C1E' : '#FAFAFA'
                    : theme.colors.textSecondary,
                  fontWeight: activeTab === 'calendar' ? '600' : '400',
                },
              ]}
            >
              日历
            </Text>
          </TouchableOpacity>

          {/* Todo Tab */}
          <TouchableOpacity
            style={styles.segment}
            onPress={() => handleTabPress('todo')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'todo'
                    ? theme.mode === 'dark' ? '#1C1C1E' : '#FAFAFA'
                    : theme.colors.textSecondary,
                  fontWeight: activeTab === 'todo' ? '600' : '400',
                },
              ]}
            >
              待办
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add"
            size={28}
            color={theme.mode === 'dark' ? '#1C1C1E' : '#FAFAFA'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  } as any,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  circleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    gap: 8,
    overflow: 'hidden',
  },
  segmentedIndicator: {
    position: 'absolute',
    width: 70,
    height: 32,
    borderRadius: 16,
    top: 4,
    left: 4,
  },
  segment: {
    width: 70,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
  },
});

export default FloatingNavBar;