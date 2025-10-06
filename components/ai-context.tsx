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

  console.log("[onSubmit] Starting with message:", message);

  const aiState = getMutableAIState();
  const currentState = aiState.get();
  console.log("[onSubmit] Current AI state:", currentState);
  console.log("[onSubmit] Current messages:", currentState?.messages);
  console.log(
    "[onSubmit] Messages is array:",
    Array.isArray(currentState?.messages)
  );

  // Ensure messages is always an array
  const currentMessages = Array.isArray(currentState?.messages)
    ? currentState.messages
    : [];

  aiState.update({
    ...currentState,
    messages: [
      ...currentMessages,
      {
        id: nanoid(),
        role: "user",
        content: message,
      },
    ],
  });

  console.log(
    "[onSubmit] AI state updated, total messages:",
    aiState.get().messages.length
  );

  //
  let headers;
  try {
    headers = await unstable_headers();
    console.log("[onSubmit] Headers retrieved successfully");
  } catch (error) {
    console.error("[onSubmit] Error getting headers:", error);
    headers = new Headers();
  }

  const tools: Record<string, any> = {};

  // The map feature is native only for now.
  if (process.env.EXPO_OS !== "web") {
    tools.get_points_of_interest = {
      description:
        "Get real places and things to do from Google Places API for a location. Use this to find actual restaurants, attractions, and venues to include in the itinerary.",
      inputSchema: z.object({
        poi: z
          .string()
          .describe(
            'Specific query to send to the Google Places API. e.g. "restaurants in Paris", "museums in Amsterdam", "things to do in Las Vegas". Be specific about the type of place you want.'
          ),
      }),
      generate: async function* (args: { poi: string }) {
        const { poi } = args;
        console.log("[get_points_of_interest] Called with poi:", poi);
        // Show a spinner on the client while we wait for the response.
        yield <MapSkeleton />;

        console.log("[get_points_of_interest] Fetching places info...");
        let pointsOfInterest = await getPlacesInfo(poi);
        console.log(
          "[get_points_of_interest] Got results:",
          pointsOfInterest.length,
          "places"
        );

        // Return the points of interest card to the client.
        return <MapCard city={poi} data={pointsOfInterest} />;
      },
    };
  }

  const staticTools = ["create_itinerary", "get_destination_info"];
  const dynamicTools = Array.isArray(Object.keys(tools))
    ? Object.keys(tools)
    : [];
  const allToolNames = [...dynamicTools, ...staticTools];

  console.log(
    "[onSubmit] Dynamic tools:",
    dynamicTools.length > 0 ? dynamicTools : "none"
  );
  console.log("[onSubmit] All tools available:", allToolNames);
  console.log("[onSubmit] Starting streamUI...");

  let result;
  try {
    result = await streamUI({
      model: vertex("gemini-2.5-flash-lite"),
      temperature: 0.7,
      system: `You are a helpful travel planning assistant.

Your user is located in: ${headers.get("eas-ip-city") ?? "Paris"}, ${
        headers.get("eas-ip-region") ?? "France"
      }

CRITICAL: You have access to specialized tools that you MUST use for travel-related requests:

1. create_itinerary - REQUIRED for trip planning requests (e.g., "plan a trip", "create an itinerary", "what should I do in...")
2. get_destination_info - REQUIRED for destination information requests (e.g., "tell me about Paris", "best time to visit Rome")${
        process.env.EXPO_OS !== "web"
          ? "\n3. get_points_of_interest - REQUIRED to find real places, restaurants, and attractions"
          : ""
      }

IMPORTANT: 
- ALWAYS use these tools for travel requests. 
- NEVER respond with plain text for travel planning or destination queries.
- If user asks about a trip or destination, you MUST call the appropriate tool.`,
      messages: (Array.isArray(aiState.get()?.messages)
        ? aiState.get().messages
        : []
      ).map((message: Message) => ({
        role: message.role,
        content: message.content,
        name: message.name,
      })),
      maxSteps: 5,
      maxRetries: 2,
      onFinish: async (event: any) => {
        console.log("[onFinish] ============ STREAM FINISHED ============");
        console.log("[onFinish] Event:", JSON.stringify(event, null, 2));
      },
      onStepFinish: async (event: any) => {
        console.log("[onStepFinish] ============ STEP FINISHED ============");
        console.log("[onStepFinish] Finish reason:", event.finishReason);
        console.log(
          "[onStepFinish] Has tool calls:",
          event.toolCalls?.length > 0
        );
        console.log("[onStepFinish] Tool count:", event.toolCalls?.length || 0);
        console.log("[onStepFinish] Text preview:", event.text?.slice(0, 100));
        console.log("[onStepFinish] Event keys:", Object.keys(event));

        if (event.toolCalls && event.toolCalls.length > 0) {
          console.log("[onStepFinish] ✅ TOOLS WERE CALLED:");
          event.toolCalls.forEach((toolCall: any, index: number) => {
            console.log(`[onStepFinish] Tool ${index + 1}:`, {
              toolName: toolCall.toolName,
              args: toolCall.args,
            });
          });
        } else {
          console.log(
            "[onStepFinish] ❌ NO TOOLS CALLED - AI generated text instead"
          );
        }
        console.log("[onStepFinish] =======================================");
      },
      text: async function* ({ content, done }: any) {
        console.log(
          "[text] Streaming chunk, done:",
          done,
          "content length:",
          content?.length
        );

        if (done) {
          console.log("[text] Stream complete, final content:", content);
          const currentState = aiState.get();
          const currentMessages = Array.isArray(currentState?.messages)
            ? currentState.messages
            : [];
          aiState.done({
            ...currentState,
            messages: [
              ...currentMessages,
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
            "Creates a detailed day-by-day travel itinerary for any trip planning request. Use this tool when the user asks about planning a trip, creating an itinerary, or wants to know what to do during their visit to a destination.",
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
                      activity: z
                        .string()
                        .describe(
                          "Activity name - use real place names when possible"
                        ),
                      location: z
                        .string()
                        .describe(
                          "Specific location/venue with real place name (e.g., 'Eiffel Tower', 'Le Jules Verne Restaurant')"
                        ),
                      notes: z
                        .string()
                        .optional()
                        .describe(
                          "Additional notes, tips, or booking information"
                        ),
                    })
                  ),
                })
              )
              .describe("Day-by-day itinerary with real places"),
          }),
          generate: async function* (args: {
            destination: string;
            duration: string;
            days: any[];
          }) {
            const { destination, duration, days } = args;
            console.log(
              "[create_itinerary] Called with destination:",
              destination,
              "duration:",
              duration,
              "days:",
              days.length
            );
            yield <ItinerarySkeleton />;

            const itineraryData: ItineraryData = {
              destination,
              duration,
              days,
            };

            console.log("[create_itinerary] Returning itinerary card");
            return (
              <ItineraryCard
                data={itineraryData}
                title="Your Travel Itinerary"
              />
            );
          },
        },
        get_destination_info: {
          description:
            "Provides comprehensive information about a travel destination including description, best time to visit, highlights, and budget. Use this when the user asks about a specific city or destination.",
          inputSchema: z.object({
            name: z.string().describe("Destination name"),
            description: z
              .string()
              .optional()
              .describe(
                "Engaging description of the destination with key facts"
              ),
            bestTimeToVisit: z
              .string()
              .optional()
              .describe("Best time to visit with weather info"),
            highlights: z
              .array(z.string())
              .optional()
              .describe(
                "Key highlights and must-see attractions (at least 4-5 items)"
              ),
            estimatedBudget: z
              .string()
              .optional()
              .describe(
                "Estimated daily budget range for the trip (e.g., '$100-200 per day')"
              ),
          }),
          generate: async function* (args: {
            name: string;
            description?: string;
            bestTimeToVisit?: string;
            highlights?: string[];
            estimatedBudget?: string;
          }) {
            const {
              name,
              description,
              bestTimeToVisit,
              highlights,
              estimatedBudget,
            } = args;
            console.log(
              "[get_destination_info] Called with name:",
              name,
              "highlights:",
              highlights?.length || 0
            );
            yield <DestinationSkeleton />;

            const destinationData: DestinationInfo = {
              name,
              description: description || `Information about ${name}`,
              bestTimeToVisit: bestTimeToVisit || "Year-round",
              highlights: highlights || [],
              estimatedBudget: estimatedBudget || "Varies",
            };

            console.log("[get_destination_info] Returning destination card");
            return <DestinationCard data={destinationData} />;
          },
        },
      },
    } as any);
  } catch (error) {
    console.error("[onSubmit] Error in streamUI:", error);
    console.error(
      "[onSubmit] Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    throw error;
  }

  console.log("[onSubmit] streamUI completed");
  console.log("[onSubmit] result type:", typeof result);
  console.log("[onSubmit] result keys:", Object.keys(result || {}));
  console.log("[onSubmit] result.value type:", typeof result?.value);
  console.log("[onSubmit] Awaiting result.value...");

  // Return the UI element from the stream
  const finalValue = await result.value;
  console.log("[onSubmit] Final value type:", typeof finalValue);
  console.log(
    "[onSubmit] Final value is React element:",
    !!finalValue && typeof finalValue === "object" && "$$typeof" in finalValue
  );
  return finalValue;
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
