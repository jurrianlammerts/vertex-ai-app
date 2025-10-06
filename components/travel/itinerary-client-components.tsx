"use client";

import { Card } from "@/components/card";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Minimal local type to match user's RoutePlace for UI usage
type DisplayName = { text: string };
export type RoutePlace = {
  id?: number;
  record_id?: number;
  route_id?: number;
  displayName?: DisplayName;
  primaryTypeDisplayName?: DisplayName;
  formattedAddress?: string;
  place_id?: string;
  name?: DisplayName;
  type?: DisplayName;
  address?: string;
  day_number?: number | null;
  position_in_day?: number;
  photo?: string;
  country?: string;
  latitude: string | number;
  longitude: string | number;
  websiteUri?: string;
};

export function PlacesListCard({
  title = "Places",
  places,
}: {
  title?: string;
  places: RoutePlace[];
}) {
  return (
    <Card title={title} style={{ padding: 0 }}>
      <View style={styles.container}>
        {places.map((p, idx) => (
          <View key={`${p.place_id ?? idx}`} style={styles.itemRow}>
            <View style={styles.thumb} />
            <View style={styles.texts}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}
                numberOfLines={1}
              >
                {p?.name?.text ?? p?.displayName?.text ?? "Unknown"}
              </Text>
              <Text
                style={{ fontSize: 14, color: "#6b7280" }}
                numberOfLines={1}
              >
                {p?.type?.text ?? p?.primaryTypeDisplayName?.text ?? "Place"}
              </Text>
              <Text
                style={{ fontSize: 13, color: "#9ca3af" }}
                numberOfLines={1}
              >
                {p?.address ??
                  p?.formattedAddress ??
                  `${p.latitude}, ${p.longitude}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  texts: {
    flex: 1,
  },
});
