"use client";

import * as Haptics from "expo-haptics";
import React from "react";
import { TouchableOpacity, ViewStyle } from "react-native";

export function DestinationTouchable({
  destination,
  children,
  style,
  onPress,
}: {
  destination: { name: string };
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
