import { Card } from "@/components/card";
import Skeleton from "@/components/ui/Skeleton";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export interface ItineraryDay {
  day: number;
  title: string;
  activities: {
    time: string;
    activity: string;
    location: string;
    notes?: string;
  }[];
}

export interface ItineraryData {
  destination: string;
  duration: string;
  days: ItineraryDay[];
}

interface ItineraryCardProps {
  data: ItineraryData;
  title?: string;
}

export function ItinerarySkeleton() {
  return (
    <Card
      title="Creating itinerary..."
      style={{
        padding: 0,
        pointerEvents: "none",
      }}
    >
      <View style={{ padding: 24, gap: 16 }}>
        <Skeleton
          dark={false}
          style={{ width: "75%", height: 24, borderRadius: 8 }}
        />
        <Skeleton
          dark={false}
          style={{ width: "50%", height: 16, borderRadius: 8 }}
        />
        <View style={{ gap: 12, marginTop: 8 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              dark={false}
              style={{ width: "100%", height: 80, borderRadius: 12 }}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}

export function ItineraryCard({
  data,
  title = "Your Travel Itinerary",
}: ItineraryCardProps) {
  console.log("ItineraryCard: ", data);
  return (
    <Card title={title} style={{ padding: 0 }}>
      <View style={{ padding: 24 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#2563eb",
            marginBottom: 4,
          }}
        >
          {data.destination}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#4b5563",
            marginBottom: 24,
          }}
        >
          {data.duration}
        </Text>

        <ScrollView style={{ maxHeight: 384 }}>
          {data.days.map((day) => (
            <View key={day.day} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: 12,
                }}
              >
                Day {day.day}: {day.title}
              </Text>
              {day.activities.map((activity, idx) => (
                <View
                  key={idx}
                  style={{
                    marginBottom: 16,
                    marginLeft: 16,
                    borderLeftWidth: 2,
                    borderLeftColor: "#3b82f6",
                    paddingLeft: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#2563eb",
                    }}
                  >
                    {activity.time}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111827",
                      marginTop: 4,
                    }}
                  >
                    {activity.activity}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#4b5563",
                      marginTop: 4,
                    }}
                  >
                    📍 {activity.location}
                  </Text>
                  {activity.notes && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      {activity.notes}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Card>
  );
}
