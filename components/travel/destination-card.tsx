import { Card } from "@/components/card";
import Skeleton from "@/components/ui/Skeleton";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export interface DestinationInfo {
  name: string;
  description: string;
  bestTimeToVisit?: string;
  highlights: string[];
  estimatedBudget?: string;
}

interface DestinationCardProps {
  data: DestinationInfo;
  title?: string;
}

export function DestinationSkeleton() {
  return (
    <Card
      title="Loading destination..."
      style={{ padding: 0, pointerEvents: "none" }}
    >
      <View style={{ padding: 24, gap: 16 }}>
        <Skeleton
          dark={false}
          style={{ width: "75%", height: 24, borderRadius: 8 }}
        />
        <Skeleton
          dark={false}
          style={{ width: "100%", height: 80, borderRadius: 8 }}
        />
        <View style={{ gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              dark={false}
              style={{ width: "100%", height: 16, borderRadius: 8 }}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}

export function DestinationCard({
  data,
  title = "Destination Information",
}: DestinationCardProps) {
  console.log("DestinationCard: ", data);
  return (
    <Card title={title} style={{ padding: 0 }}>
      <View style={{ padding: 24, gap: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#2563eb",
          }}
        >
          {data.name}
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: "#374151",
            lineHeight: 24,
          }}
        >
          {data.description}
        </Text>

        {data.bestTimeToVisit && (
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              🌤️ Best Time to Visit
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              {data.bestTimeToVisit}
            </Text>
          </View>
        )}

        {data.estimatedBudget && (
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              💰 Estimated Budget
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              {data.estimatedBudget}
            </Text>
          </View>
        )}

        {data.highlights.length > 0 && (
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 8,
              }}
            >
              ✨ Highlights
            </Text>
            <ScrollView style={{ maxHeight: 192 }}>
              {data.highlights.map((highlight, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "#3b82f6", marginRight: 8 }}>•</Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: "#374151",
                    }}
                  >
                    {highlight}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Card>
  );
}
