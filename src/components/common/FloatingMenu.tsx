import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../stores/themeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface FloatingMenuProps {
  visible: boolean;
  onClose: () => void;
  onThemeToggle: () => void;
  onWeekView: () => void;
  onScheduleView: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  visible,
  onClose,
  onThemeToggle,
  onWeekView,
  onScheduleView,
}) => {
  const { theme, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [mounted, setMounted] = React.useState(false);
  const [menuHeight, setMenuHeight] = React.useState(0);
  const menuWidth = 200; // Known width from styles

  const handleLayout = React.useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    setMenuHeight(height);
  }, []);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      scale.value = withTiming(1, { duration: 200, easing: Easing.bezier(0.4, 0, 0.2, 1) });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (mounted) {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, scale, opacity]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    // Scale from bottom-left corner (where the button is)
    // Default scale origin is center, so we need to offset both X and Y
    // When scale = 0, the bottom-left corner should stay at the same position
    return {
      transform: [
        { translateX: -(1 - scale.value) * menuWidth / 2 },
        { translateY: (1 - scale.value) * menuHeight / 2 },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const handleThemeToggle = () => {
    // Cycle through: light -> dark -> system -> light
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('system');
    } else {
      setMode('light');
    }
    onClose();
  };

  const handleSettings = () => {
    onClose();
    // Navigate to settings (TODO: create settings page)
  };

  const handleAbout = () => {
    onClose();
    // Navigate to about (TODO: create about page)
  };

  const handleWeekView = () => {
    onWeekView();
    onClose();
  };

  const handleScheduleView = () => {
    onScheduleView();
    onClose();
  };

  const menuItems: MenuItem[] = [
    { id: 'settings', label: '设置', icon: 'settings-outline', onPress: handleSettings },
    {
      id: 'theme',
      label: `主题: ${mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '跟随系统'}`,
      icon: mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline',
      onPress: handleThemeToggle,
    },
    { id: 'about', label: '关于', icon: 'information-circle-outline', onPress: handleAbout },
    { id: 'week', label: '周视图', icon: 'calendar-outline', onPress: handleWeekView },
    { id: 'schedule', label: '日程视图', icon: 'list-outline', onPress: handleScheduleView },
  ];

  const renderGlassBackground = () => {
    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            styles.webGlass,
            {
              backgroundColor: theme.mode === 'dark'
                ? 'rgba(44, 44, 46, 0.95)'
                : 'rgba(250, 250, 250, 0.95)',
              borderColor: theme.colors.border,
            },
          ]}
        />
      );
    }

    return (
      <BlurView
        intensity={50}
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        style={[
          styles.glass,
          {
            backgroundColor: theme.mode === 'dark'
              ? 'rgba(44, 44, 46, 0.8)'
              : 'rgba(250, 250, 250, 0.8)',
            borderColor: theme.colors.border,
          },
        ]}
      />
    );
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop - transparent tap-to-close area */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Menu */}
      <Animated.View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 80, backgroundColor: theme.colors.surface }, animatedContainerStyle]} onLayout={handleLayout}>
        {renderGlassBackground()}

        <View style={styles.menuContent}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                {
                  borderBottomColor: theme.colors.border,
                },
                index === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={theme.colors.text}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuLabel, { color: theme.colors.text }]}>
                {item.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  container: {
    position: 'absolute',
    left: 16,
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginLeft: '5%',
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  webGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  } as any,
  menuContent: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
  },
});

export default FloatingMenu;