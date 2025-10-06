import { ScrollView, Text, View } from "react-native";
import { tw } from "../../util/tw";

export interface DestinationInfo {
  name: string;
  description: string;
  bestTimeToVisit?: string;
  highlights: string[];
  estimatedBudget?: string;
}

interface DestinationCardProps {
  data?: DestinationInfo;
}

export function DestinationSkeleton() {
  console.log("[DestinationSkeleton] Rendering");
  return (
    <View style={tw`bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 my-4`}>
      <View style={tw`bg-gray-300 dark:bg-gray-700 h-6 w-3/4 rounded mb-4`} />
      <View style={tw`bg-gray-300 dark:bg-gray-700 h-20 w-full rounded mb-4`} />
      <View style={tw`space-y-2`}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={tw`bg-gray-200 dark:bg-gray-700 h-4 w-full rounded`}
          />
        ))}
      </View>
    </View>
  );
}

export function DestinationCard({ data }: DestinationCardProps) {
  console.log("[DestinationCard] Rendering with data:", data);
  if (!data) {
    return <DestinationSkeleton />;
  }

  return (
    <View style={tw`bg-white dark:bg-gray-800 rounded-2xl p-6 my-4 shadow-lg`}>
      <Text
        style={tw`text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3`}
      >
        {data.name}
      </Text>

      <Text
        style={tw`text-base text-gray-700 dark:text-gray-300 mb-4 leading-6`}
      >
        {data.description}
      </Text>

      {data.bestTimeToVisit && (
        <View style={tw`mb-4`}>
          <Text
            style={tw`text-sm font-semibold text-gray-900 dark:text-white mb-1`}
          >
            🌤️ Best Time to Visit
          </Text>
          <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
            {data.bestTimeToVisit}
          </Text>
        </View>
      )}

      {data.estimatedBudget && (
        <View style={tw`mb-4`}>
          <Text
            style={tw`text-sm font-semibold text-gray-900 dark:text-white mb-1`}
          >
            💰 Estimated Budget
          </Text>
          <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
            {data.estimatedBudget}
          </Text>
        </View>
      )}

      {data.highlights.length > 0 && (
        <View>
          <Text
            style={tw`text-sm font-semibold text-gray-900 dark:text-white mb-2`}
          >
            ✨ Highlights
          </Text>
          <ScrollView style={tw`max-h-48`}>
            {data.highlights.map((highlight, idx) => (
              <View key={idx} style={tw`flex-row items-start mb-2`}>
                <Text style={tw`text-blue-500 mr-2`}>•</Text>
                <Text
                  style={tw`flex-1 text-sm text-gray-700 dark:text-gray-300`}
                >
                  {highlight}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
