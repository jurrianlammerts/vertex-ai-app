import { nanoid } from "@/util/nanoid";
import { createAI, getMutableAIState, streamUI } from "@ai-sdk/rsc";

import { generateText } from "ai";
import "server-only";
import { z } from "zod";

import { vertex } from "@ai-sdk/google-vertex";
import { unstable_headers } from "expo-router/rsc/headers";
import { View } from "react-native";
import { getPlacesInfo } from "./map/googleapis-maps";
import { MapCard } from "./map/map-card";
import MarkdownText from "./markdown-text";
import {
  DestinationCard,
  type DestinationInfo,
} from "./travel/destination-card";
import { ItineraryCard, type ItineraryData } from "./travel/itinerary-card";
import { PlacesListCard } from "./travel/itinerary-client-components";

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

  // Ensure messages is always an array and currentState is an object
  const currentMessages = Array.isArray(currentState?.messages)
    ? currentState.messages
    : [];
  const safeCurrentState = currentState || { chatId: nanoid(), messages: [] };

  aiState.update({
    ...safeCurrentState,
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

        yield <MarkdownText>Searching for places in {poi}...</MarkdownText>;

        console.log("[get_points_of_interest] Fetching places info...");
        let pointsOfInterest = await getPlacesInfo(poi);
        console.log(
          "[get_points_of_interest] Got results:",
          pointsOfInterest.length,
          "places"
        );

        // Map Google data to RoutePlace[]
        const places = (pointsOfInterest || []).map((p) => ({
          place_id: p.place_id,
          name: { text: p.name },
          type: { text: p.types?.[0] ?? "place" },
          address: p.formatted_address,
          formattedAddress: p.formatted_address,
          latitude: p.geometry.location.lat,
          longitude: p.geometry.location.lng,
          photo: p.photos?.[0]?.photo_reference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            : undefined,
          country: undefined,
          websiteUri: undefined,
        }));

        // Return both map and list for better UX
        return (
          <View style={{ gap: 16 }}>
            <MapCard city={poi} data={pointsOfInterest} />
            <PlacesListCard title="Places" places={places} />
          </View>
        );
      },
    };
  }

  const staticTools = ["create_itinerary", "get_destination_info"];
  const dynamicTools = Object.keys(tools);
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
   - Call this tool when you have a destination name
   - If duration is not specified, assume "3 days" as the default
   - NEVER ask for the duration - just use a reasonable default (3 days for cities, 5-7 days for countries)
   - Examples: "Tokyo" → use "3 days", "Italy" → use "7 days"
   
2. get_destination_info - REQUIRED for destination information requests (e.g., "tell me about Paris", "best time to visit Rome")${
        process.env.EXPO_OS !== "web"
          ? "\n3. get_points_of_interest - REQUIRED to find real places, restaurants, and attractions"
          : ""
      }

IMPORTANT RULES: 
- ALWAYS use these tools for travel requests - they create beautiful interactive cards
- NEVER respond with plain text for travel planning or destination queries
- NEVER ask follow-up questions about duration - just use sensible defaults
- If the user says "create an itinerary for Tokyo" or "plan a trip to Tokyo", immediately call create_itinerary with destination="Tokyo" and duration="3 days"
- Look at the conversation history to understand context - if user previously mentioned a destination, use it
- Be proactive and use tools immediately, don't ask clarifying questions`,
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

        // Update AI state with final messages after all tools have completed
        const currentState = aiState.get();
        const currentMessages = Array.isArray(currentState?.messages)
          ? currentState.messages
          : [];
        const safeCurrentState = currentState || {
          chatId: nanoid(),
          messages: [],
        };

        try {
          // Check if there's text content to add
          const finalText = event.text || "";
          if (finalText && finalText.trim().length > 0) {
            aiState.done({
              ...safeCurrentState,
              messages: [
                ...currentMessages,
                {
                  id: nanoid(),
                  role: "assistant" as const,
                  content: finalText,
                },
              ],
            });
          } else {
            // Just mark as done without adding empty message
            aiState.done(safeCurrentState);
          }
        } catch (error) {
          console.log(
            "[onFinish] aiState.done() error (likely already closed):",
            error
          );
        }
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

        // Log error details if finish reason is error
        if (event.finishReason === "error") {
          console.log("[onStepFinish] ❌ ERROR OCCURRED:");
          console.log("[onStepFinish] Error details:", event.error);
          console.log(
            "[onStepFinish] Response messages:",
            event.response?.messages
          );
        }

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
          // Don't call aiState.done() here - let onFinish handle it
          // to avoid closing the stream before tool generators complete
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
          }),
          generate: async function* (args: {
            destination: string;
            duration: string;
          }) {
            const { destination, duration } = args;
            console.log(
              "[create_itinerary] Called with destination:",
              destination,
              "duration:",
              duration
            );

            yield (
              <MarkdownText>
                Creating your {duration} itinerary for {destination}...
              </MarkdownText>
            );

            // Parse duration to get number of days
            const durationMatch = duration.match(/(\d+)/);
            const numDays = durationMatch ? parseInt(durationMatch[1]) : 3;

            console.log("[create_itinerary] Generating AI itinerary...");

            // Use AI to generate the itinerary content
            let aiItinerary;
            try {
              const result = (await generateText({
                // @ts-ignore
                model: vertex("gemini-2.5-flash-lite"),
                prompt: `Create a detailed ${numDays}-day travel itinerary for ${destination}. 

Format your response as a JSON array where each day has:
- day: number (1, 2, 3, etc.)
- title: string (theme for the day, e.g., "Historic Downtown" or "Cultural Exploration")
- activities: array of 4-6 activities, each with:
  - time: string (e.g., "9:00 AM")
  - activity: string (name of activity)
  - location: string (specific place name, use REAL landmarks and venues)
  - notes: string (helpful tips or booking info)

Use real, popular attractions, restaurants, and venues in ${destination}. Make it practical and exciting.

Return ONLY the JSON array, no other text.`,
              })) as any;

              console.log(
                "[create_itinerary] AI response:",
                result.text.substring(0, 200)
              );

              // Parse the AI response
              const jsonMatch = result.text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                aiItinerary = JSON.parse(jsonMatch[0]);
                console.log(
                  "[create_itinerary] Successfully parsed AI itinerary"
                );
              } else {
                throw new Error("Could not parse AI response");
              }
            } catch (error) {
              console.error(
                "[create_itinerary] Error generating AI itinerary:",
                error
              );
              // Fallback to basic structure
              aiItinerary = Array.from({ length: numDays }, (_, i) => ({
                day: i + 1,
                title: `Day ${i + 1} in ${destination}`,
                activities: [
                  {
                    time: "9:00 AM",
                    activity: "Morning Exploration",
                    location: `${destination} City Center`,
                    notes: "Start your day exploring the main attractions",
                  },
                  {
                    time: "12:00 PM",
                    activity: "Lunch",
                    location: `Local Restaurant in ${destination}`,
                    notes: "Try local cuisine",
                  },
                  {
                    time: "2:00 PM",
                    activity: "Afternoon Activities",
                    location: `Popular Areas in ${destination}`,
                    notes: "Visit museums, parks, or shopping districts",
                  },
                  {
                    time: "6:00 PM",
                    activity: "Evening Experience",
                    location: `${destination} Entertainment District`,
                    notes: "Enjoy local nightlife and dining",
                  },
                ],
              }));
            }

            const itineraryData: ItineraryData = {
              destination,
              duration,
              days: aiItinerary,
            };

            console.log(
              "[create_itinerary] Returning itinerary card with",
              aiItinerary.length,
              "days"
            );
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

            yield (
              <MarkdownText>Getting information about {name}...</MarkdownText>
            );

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
