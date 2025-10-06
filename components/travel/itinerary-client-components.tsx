"use client";

import * as Haptics from "expo-haptics";
import React from "react";
import { TouchableOpacity, ViewStyle } from "react-native";

export function ActivityTouchable({
  activity,
  children,
  style,
  onPress,
}: {
  activity: { time: string; activity: string; location: string };
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      delayLongPress={1000}
      style={style}
      activeOpacity={0.8}
      onPress={() => {
        if (process.env.EXPO_OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

export function DayTouchable({
  day,
  children,
  style,
  onPress,
}: {
  day: { day: number; title: string };
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      delayLongPress={1000}
      style={style}
      activeOpacity={0.8}
      onPress={() => {
        if (process.env.EXPO_OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
