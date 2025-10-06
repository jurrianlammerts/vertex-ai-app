import { Card } from "@/components/card";
import Skeleton from "@/components/ui/Skeleton";
import { View } from "react-native";
import { FlyoverCard } from "./flyover-map-spots";
import { PointOfInterestData } from "./googleapis-maps";

export function MapSkeleton() {
  return (
    <Card
      title="Searching area..."
      fillSpace={process.env.EXPO_OS !== "web"}
      style={{
        padding: 0,
        pointerEvents: "none",
      }}
    >
      <View style={{ padding: 8, gap: 8 }}>
        <Skeleton
          dark={false}
          style={{ borderRadius: 10, height: 240, width: "100%" }}
        />
        <Skeleton
          dark={false}
          style={{ borderRadius: 10, height: 96, width: "100%" }}
          delay={200}
        />
      </View>
    </Card>
  );
}

export function MapCard({
  city,
  data,
}: {
  city: string;
  data: PointOfInterestData[];
}) {
  console.log("MapCard: ", data);
  return (
    <Card
      fillSpace={process.env.EXPO_OS !== "web"}
      title={`Results for ${city}`}
      style={{ padding: 0 }}
    >
      <FlyoverCard
        locations={data
          .sort((a, b) => {
            return b.user_ratings_total - a.user_ratings_total;
          })
          .map((point) => ({
            icon: point.icon,
            rating: point.rating,
            title: point.name,
            latitude: point.geometry.location.lat,
            longitude: point.geometry.location.lng,
            address: point.formatted_address,
            isOpen: point.opening_hours?.open_now ?? false,
            userRatingsTotal: point.user_ratings_total,
            userRating: point.rating,
          }))}
      />
    </Card>
  );
}
