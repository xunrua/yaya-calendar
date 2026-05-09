import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../stores/themeStore";

interface FloatingNavBarProps {
  onMenuPress: () => void;
  onAddPress: () => void;
  activeTab: "calendar" | "todo";
  onTabChange: (tab: "calendar" | "todo") => void;
  menuOpen?: boolean;
  onTodayPress?: () => void;
  showTodayButton?: boolean;
}

export const FloatingNavBar: React.FC<FloatingNavBarProps> = ({
  onMenuPress,
  onAddPress,
  activeTab,
  onTabChange,
  menuOpen = false,
  onTodayPress,
  showTodayButton,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values for segmented control
  const indicatorPosition = useSharedValue(activeTab === "calendar" ? 0 : 1);

  // Animation values for "今" button
  const todayButtonScale = useSharedValue(0);
  const todayButtonOpacity = useSharedValue(0);

  React.useEffect(() => {
    indicatorPosition.value = withTiming(activeTab === "calendar" ? 0 : 1, {
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [activeTab, indicatorPosition]);

  // "今"按钮显示/隐藏动画（参考 FloatingMenu 的回弹效果）
  React.useEffect(() => {
    if (showTodayButton) {
      todayButtonScale.value = withTiming(
        1.02,
        { duration: 280, easing: Easing.bezier(0.4, 0, 0.2, 1) },
        (finished) => {
          if (finished) {
            todayButtonScale.value = withTiming(1, { duration: 150 });
          }
        }
      );
      todayButtonOpacity.value = withTiming(1, { duration: 280 });
    } else {
      todayButtonScale.value = withTiming(0, { duration: 150 });
      todayButtonOpacity.value = withTiming(0, { duration: 150 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTodayButton]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = 80;
    const gap = 8;
    const totalOffset = indicatorPosition.value * (segmentWidth + gap);
    return {
      transform: [{ translateX: totalOffset }],
    };
  });

  const animatedTodayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: todayButtonScale.value }],
    opacity: todayButtonOpacity.value,
  }));

  const handleTabPress = (tab: "calendar" | "todo") => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  const handleMenuPress = () => {
    onMenuPress();
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 8, paddingBottom: 8 }]}>
      <View style={styles.content}>
        {/* Menu Button */}
        <TouchableOpacity
          style={[
            styles.circleButton,
            {
              backgroundColor:
                theme.mode === "dark" ? "rgba(58, 58, 60, 0.8)" : "rgba(235, 235, 235, 0.8)",
            },
          ]}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons name={menuOpen ? "close" : "menu"} size={24} color={theme.colors.text} />
        </TouchableOpacity>

        {/* Today Button */}
        {showTodayButton !== undefined && (
          <Animated.View style={[styles.todayButtonContainer, animatedTodayStyle]}>
            <TouchableOpacity
              style={[styles.todayButton, { backgroundColor: theme.colors.primary }]}
              onPress={onTodayPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.todayButtonText, { color: theme.mode === "dark" ? "#1C1C1E" : "#FAFAFA" }]}>
                今
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Segmented Control */}
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor:
                theme.mode === "dark" ? "rgba(58, 58, 60, 0.6)" : "rgba(235, 235, 235, 0.6)",
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
            onPress={() => handleTabPress("calendar")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "calendar"
                      ? theme.mode === "dark"
                        ? "#1C1C1E"
                        : "#FAFAFA"
                      : theme.colors.textSecondary,
                  fontWeight: activeTab === "calendar" ? "600" : "400",
                },
              ]}
            >
              日历
            </Text>
          </TouchableOpacity>

          {/* Todo Tab */}
          <TouchableOpacity
            style={styles.segment}
            onPress={() => handleTabPress("todo")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeTab === "todo"
                      ? theme.mode === "dark"
                        ? "#1C1C1E"
                        : "#FAFAFA"
                      : theme.colors.textSecondary,
                  fontWeight: activeTab === "todo" ? "600" : "400",
                },
              ]}
            >
              日程
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
          <Ionicons name="add" size={28} color={theme.mode === "dark" ? "#1C1C1E" : "#FAFAFA"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: "5%",
    paddingRight: "5%",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedContainer: {
    flexDirection: "row",
    borderRadius: 22,
    borderWidth: 1,
    padding: 4,
    height: 46,
    gap: 8,
    overflow: "hidden",
    alignItems: "center",
  },
  segmentedIndicator: {
    position: "absolute",
    width: 80,
    height: 36,
    borderRadius: 18,
    top: 4,
    left: 4,
  },
  segment: {
    width: 80,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 14,
  },
  todayButtonContainer: {
    marginRight: 8,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default FloatingNavBar;
