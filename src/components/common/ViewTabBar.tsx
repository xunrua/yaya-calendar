import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { parseISO, getMonth } from "date-fns";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../stores/themeStore";
import { useViewStore } from "../../stores/eventStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ViewType } from "../../domain/types";

const SCREEN_WIDTH = Dimensions.get("window").width;

const VIEW_TABS: { key: ViewType; label: string }[] = [
  { key: "month", label: "月" },
  { key: "year", label: "年" },
];

const ANIMATION_CONFIG = {
  duration: 280,
  easing: Easing.bezier(0.34, 1.2, 0.64, 1),
};

const PRIMARY_COLOR = "#E8563A";

// 计算月份在年视图网格中的位置（content-area-relative 坐标）
const calculateMonthPositionInYearView = (month: number, insetsTop: number): { x: number; y: number; width: number; height: number } => {
  const col = month % 3;
  const row = Math.floor(month / 3);

  // 年视图网格参数（对应 YearView 样式）
  const cellWidth = SCREEN_WIDTH / 3;
  const paddingHorizontal = 6;
  const yearHeaderHeight = 34; // yearTitle paddingTop(10) + text + paddingBottom(6)
  const monthWidth = cellWidth - paddingHorizontal * 2;
  const monthHeight = 175; // paddingVertical(20) + title(21) + dayGrid(6*24=144)

  const x = col * cellWidth + paddingHorizontal;
  const y = insetsTop + yearHeaderHeight + row * monthHeight;

  return { x, y, width: monthWidth, height: monthHeight };
};

export const ViewTabBar: React.FC = () => {
  const { theme } = useTheme();
  const { currentView, setCurrentView, selectedDate, setTransitionState } = useViewStore();
  const insets = useSafeAreaInsets();
  const indicatorPosition = useSharedValue(0);

  const activeIndex = VIEW_TABS.findIndex((tab) => tab.key === currentView);

  useEffect(() => {
    if (activeIndex >= 0) {
      indicatorPosition.value = withTiming(activeIndex, ANIMATION_CONFIG);
    }
  }, [activeIndex, indicatorPosition]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const segmentWidth = 56;
    const totalOffset = indicatorPosition.value * segmentWidth;
    return {
      transform: [{ translateX: totalOffset }],
    };
  });

  const handleTabPress = (view: ViewType) => {
    if (view !== currentView) {
      if (view === "year" && currentView === "month") {
        // 月→年：计算当前月份在年视图中的位置
        const date = parseISO(selectedDate);
        const month = getMonth(date);
        const layout = calculateMonthPositionInYearView(month, insets.top);
        setTransitionState({ sourceLayout: layout });
      }
      setCurrentView(view);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor:
              theme.mode === "dark"
                ? "rgba(58, 58, 60, 0.6)"
                : "rgba(240, 240, 240, 0.8)",
          },
        ]}
      >
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              backgroundColor:
                theme.mode === "dark" ? "rgba(255, 255, 255, 0.9)" : "#FFFFFF",
            },
            animatedIndicatorStyle,
          ]}
        />

        {VIEW_TABS.map((tab) => {
          const isActive = tab.key === currentView;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive
                      ? PRIMARY_COLOR
                      : theme.colors.textSecondary,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    height: 40,
    overflow: "hidden",
    alignItems: "center",
    alignSelf: "center",
  },
  tabIndicator: {
    position: "absolute",
    width: 56,
    height: 32,
    borderRadius: 999,
    top: 4,
    left: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  tabItem: {
    width: 56,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 14,
  },
});

export default ViewTabBar;