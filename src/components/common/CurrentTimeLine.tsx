import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { isSameDay } from "date-fns";

const PRIMARY_COLOR = "#E8563A";

interface CurrentTimeLineProps {
  hourHeight: number;
  startHour?: number;
  leftOffset?: number;
  selectedDate?: string;
}

export const CurrentTimeLine: React.FC<CurrentTimeLineProps> = ({
  hourHeight,
  startHour = 0,
  leftOffset = 48,
  selectedDate,
}) => {
  const [topPosition, setTopPosition] = useState(0);

  const calculatePosition = useCallback(() => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    return (hours - startHour) * hourHeight;
  }, [hourHeight, startHour]);

  useEffect(() => {
    setTopPosition(calculatePosition());

    const interval = setInterval(() => {
      setTopPosition(calculatePosition());
    }, 60_000);

    return () => clearInterval(interval);
  }, [calculatePosition]);

  const today = new Date();
  const currentDate = selectedDate ? new Date(selectedDate) : today;
  const isToday = isSameDay(currentDate, today);

  if (!isToday) {
    return null;
  }

  return (
    <View style={[styles.line, { top: topPosition, left: leftOffset }]}>
      <View style={[styles.dot, { backgroundColor: PRIMARY_COLOR }]} />
      <View style={[styles.horizontalLine, { backgroundColor: PRIMARY_COLOR }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  line: {
    position: "absolute",
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 100,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
  },
  horizontalLine: {
    height: 1.5,
    flex: 1,
  },
});

export default CurrentTimeLine;