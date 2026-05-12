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
import { SegmentedControl } from "./SegmentedControl";

const TABS: { key: NavTab; label: string }[] = [
  { key: "calendar", label: "日历" },
  { key: "todo", label: "日程" },
];

type NavTab = "calendar" | "todo";

interface FloatingNavBarProps {
  onMenuPress: () => void;
  onAddPress: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
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
  const isDark = theme.mode === "dark";

  // Animation values for "今" button
  const todayButtonScale = useSharedValue(0);
  const todayButtonOpacity = useSharedValue(0);

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
  }, [showTodayButton, todayButtonScale, todayButtonOpacity]);

  const animatedTodayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: todayButtonScale.value }],
    opacity: todayButtonOpacity.value,
  }));

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 8, paddingBottom: 8 }]}>
      <View style={styles.content}>
        {/* Left Group: Menu Button */}
        <View style={styles.leftGroup}>
          <TouchableOpacity
            style={[
              styles.circleButton,
              {
                backgroundColor:
                  theme.mode === "dark" ? "rgba(58, 58, 60, 0.8)" : "rgba(235, 235, 235, 0.8)",
              },
            ]}
            onPress={onMenuPress}
            activeOpacity={0.7}
          >
            <Ionicons name={menuOpen ? "close" : "menu"} size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Segmented Control - Centered */}
        <SegmentedControl
          tabs={TABS}
          activeKey={activeTab}
          onChange={(key) => onTabChange(key as NavTab)}
          segmentWidth={80}
          segmentHeight={36}
          gap={8}
          containerStyle={[
            styles.segmentedContainer,
            {
              backgroundColor: isDark ? "rgba(58, 58, 60, 0.6)" : "rgba(235, 235, 235, 0.6)",
              borderColor: theme.colors.border,
            },
          ]}
          indicatorStyle={{ backgroundColor: theme.colors.primary }}
          activeTextColor={isDark ? "#1C1C1E" : "#FAFAFA"}
          inactiveTextColor={theme.colors.textSecondary}
        />

        {/* Right Group: Today Button + Add Button */}
        <View style={styles.rightGroup}>
          {/* Today Button - floating above add button */}
          {showTodayButton !== undefined && (
            <Animated.View style={[styles.todayButtonContainer, animatedTodayStyle]}>
              <TouchableOpacity
                style={[styles.todayButton, { backgroundColor: theme.colors.primary }]}
                onPress={onTodayPress}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.todayButtonText,
                    { color: theme.mode === "dark" ? "#1C1C1E" : "#FAFAFA" },
                  ]}
                >
                  今
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

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
    justifyContent: "center",
    gap: 12,
    paddingLeft: "5%",
    paddingRight: "5%",
  },
  leftGroup: {
    position: "absolute",
    left: "5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightGroup: {
    position: "absolute",
    right: "5%",
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
    elevation: 8,
  },
  segmentedContainer: {
    borderRadius: 22,
    borderWidth: 1,
    height: 46,
    overflow: "hidden",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
    elevation: 8,
  },
  todayButtonContainer: {
    position: "absolute",
    bottom: 52,
    right: 0,
  },
  todayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
    elevation: 8,
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default FloatingNavBar;
