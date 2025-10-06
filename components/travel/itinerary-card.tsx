import { ScrollView, Text, View } from "react-native";
import { tw } from "../../util/tw";

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
  data?: ItineraryData;
  title?: string;
}

export function ItinerarySkeleton() {
  return (
    <View style={tw`bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 my-4`}>
      <View style={tw`bg-gray-300 dark:bg-gray-700 h-6 w-3/4 rounded mb-4`} />
      <View style={tw`bg-gray-300 dark:bg-gray-700 h-4 w-1/2 rounded mb-6`} />
      <View style={tw`space-y-3`}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={tw`bg-gray-200 dark:bg-gray-700 h-20 rounded-xl`}
          />
        ))}
      </View>
    </View>
  );
}

export function ItineraryCard({ data, title }: ItineraryCardProps) {
  if (!data) {
    return <ItinerarySkeleton />;
  }

  return (
    <View style={tw`bg-white dark:bg-gray-800 rounded-2xl p-6 my-4 shadow-lg`}>
      {title && (
        <Text style={tw`text-xl font-bold text-gray-900 dark:text-white mb-2`}>
          {title}
        </Text>
      )}
      <Text
        style={tw`text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1`}
      >
        {data.destination}
      </Text>
      <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-6`}>
        {data.duration}
      </Text>

      <ScrollView style={tw`max-h-96`}>
        {data.days.map((day) => (
          <View key={day.day} style={tw`mb-6`}>
            <Text
              style={tw`text-lg font-semibold text-gray-900 dark:text-white mb-3`}
            >
              Day {day.day}: {day.title}
            </Text>
            {day.activities.map((activity, idx) => (
              <View
                key={idx}
                style={tw`mb-4 ml-4 border-l-2 border-blue-500 pl-4`}
              >
                <Text
                  style={tw`text-sm font-medium text-blue-600 dark:text-blue-400`}
                >
                  {activity.time}
                </Text>
                <Text
                  style={tw`text-base font-semibold text-gray-900 dark:text-white mt-1`}
                >
                  {activity.activity}
                </Text>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mt-1`}>
                  📍 {activity.location}
                </Text>
                {activity.notes && (
                  <Text
                    style={tw`text-sm text-gray-500 dark:text-gray-500 mt-1 italic`}
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
  );
}
