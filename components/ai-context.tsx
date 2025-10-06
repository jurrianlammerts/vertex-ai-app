import { createAI, getMutableAIState, streamUI } from "@ai-sdk/rsc";

import "server-only";
import { z } from "zod";

import { vertex } from "@ai-sdk/google-vertex";
import { unstable_headers } from "expo-router/rsc/headers";
import { getPlacesInfo } from "./map/googleapis-maps";
import { MapCard, MapSkeleton } from "./map/map-card";
import MarkdownText from "./markdown-text";
import {
  DestinationCard,
  DestinationSkeleton,
  type DestinationInfo,
} from "./travel/destination-card";
import {
  ItineraryCard,
  ItinerarySkeleton,
  type ItineraryData,
} from "./travel/itinerary-card";

// Check for required Google Vertex AI credentials
if (!process.env.GOOGLE_VERTEX_PROJECT) {
  throw new Error(
    "GOOGLE_VERTEX_PROJECT is required - set it in your .env file"
  );
}
if (!process.env.GOOGLE_VERTEX_LOCATION) {
  throw new Error(
    "GOOGLE_VERTEX_LOCATION is required - set it in your .env file"
  );
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS is required - set it in your .env file"
  );
}

export async function onSubmit(message: string) {
  "use server";

  const aiState = getMutableAIState();

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: "user",
        content: message,
      },
    ],
  });

  //
  const headers = await unstable_headers();

  const tools: Record<string, any> = {};

  // The map feature is native only for now.
  if (process.env.EXPO_OS !== "web") {
    tools.get_points_of_interest = {
      description: "Get things to do for a point of interest or city",
      inputSchema: z.object({
        poi: z
          .string()
          .describe(
            'query to send to the Google Places API. e.g. "things to do in Amsterdam" or "casinos and hotels in Las Vegas"'
          ),
      }),
      generate: async function* ({ poi }: { poi: string }) {
        console.log("city", poi);
        // Show a spinner on the client while we wait for the response.
        yield <MapSkeleton />;

        let pointsOfInterest = await getPlacesInfo(poi);

        // Return the points of interest card to the client.
        return <MapCard city={poi} data={pointsOfInterest} />;
      },
    };
  }

  const result = await streamUI({
    model: vertex("gemini-2.5-pro"),
    messages: [
      {
        role: "system",
        content: `\
You are an expert travel itinerary planner assistant. You help users plan amazing trips by:
- Creating detailed day-by-day itineraries
- Suggesting destinations based on preferences
- Finding points of interest and activities
- Providing travel tips and recommendations

You have the following tools available:
- create_itinerary: Creates a detailed travel itinerary for a destination
- get_destination_info: Gets information about a travel destination
- get_points_of_interest: Finds things to do at a location (native only)
- google_search: Search the web for real-time travel information

User info:
- city: ${headers.get("eas-ip-city") ?? (__DEV__ ? "Austin" : "unknown")}
- country: ${headers.get("eas-ip-country") ?? (__DEV__ ? "US" : "unknown")}
- region: ${headers.get("eas-ip-region") ?? (__DEV__ ? "TX" : "unknown")}
- device platform: ${headers.get("expo-platform") ?? "unknown"}
`,
      },
      ...aiState.get().messages.map((message: Message) => ({
        role: message.role,
        content: message.content,
        name: message.name,
      })),
    ],
    text: async function* ({ content, done }: any) {
      if (done) {
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: "assistant" as const,
              content,
            },
          ],
        });
      }
      return <MarkdownText done={done}>{content}</MarkdownText>;
    } as any,
    // Define the tools here:
    tools: {
      ...tools,
      create_itinerary: {
        description:
          "Create a detailed travel itinerary for a destination with day-by-day activities",
        inputSchema: z.object({
          destination: z.string().describe("The destination for the trip"),
          duration: z
            .string()
            .describe("Duration of the trip (e.g., '5 days', '1 week')"),
          days: z
            .array(
              z.object({
                day: z.number().describe("Day number"),
                title: z.string().describe("Title/theme for the day"),
                activities: z.array(
                  z.object({
                    time: z
                      .string()
                      .describe("Time of activity (e.g., '9:00 AM')"),
                    activity: z.string().describe("Activity name"),
                    location: z.string().describe("Location/venue"),
                    notes: z
                      .string()
                      .optional()
                      .describe("Additional notes or tips"),
                  })
                ),
              })
            )
            .describe("Day-by-day itinerary"),
        }),
        generate: async function* ({
          destination,
          duration,
          days,
        }: {
          destination: string;
          duration: string;
          days: any[];
        }) {
          yield <ItinerarySkeleton />;

          const itineraryData: ItineraryData = {
            destination,
            duration,
            days,
          };

          return (
            <ItineraryCard data={itineraryData} title="Your Travel Itinerary" />
          );
        },
      },
      get_destination_info: {
        description:
          "Get detailed information about a travel destination including best time to visit, highlights, and budget",
        inputSchema: z.object({
          name: z.string().describe("Destination name"),
          description: z
            .string()
            .describe("Brief description of the destination"),
          bestTimeToVisit: z.string().optional().describe("Best time to visit"),
          highlights: z
            .array(z.string())
            .describe("Key highlights and attractions"),
          estimatedBudget: z
            .string()
            .optional()
            .describe("Estimated budget for the trip"),
        }),
        generate: async function* ({
          name,
          description,
          bestTimeToVisit,
          highlights,
          estimatedBudget,
        }: {
          name: string;
          description: string;
          bestTimeToVisit?: string;
          highlights: string[];
          estimatedBudget?: string;
        }) {
          yield <DestinationSkeleton />;

          const destinationData: DestinationInfo = {
            name,
            description,
            bestTimeToVisit,
            highlights,
            estimatedBudget,
          };

          return <DestinationCard data={destinationData} />;
        },
      },
      google_search: vertex.tools.googleSearch({}),
    },
  } as any);

  return {
    id: nanoid(),
    display: result.value,
  };
}

const nanoid = () => Math.random().toString(36).slice(2);

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  name?: string;
};

export type AIState = {
  chatId: string;
  messages: Message[];
};

export type UIState = {
  id: string;
  display: React.ReactNode;
}[];

const actions = {
  onSubmit,
} as const;

export const AI = createAI<AIState, UIState, typeof actions>({
  actions,
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
});
