import { createAI, getMutableAIState, streamUI } from "@ai-sdk/rsc";

import { generateObject } from "ai";
import "server-only";
import { z } from "zod";

import { vertex } from "@ai-sdk/google-vertex";
import { unstable_headers } from "expo-router/rsc/headers";
import { getPlacesInfo } from "./map/googleapis-maps";
import { MapCard } from "./map/map-card";
import MarkdownText from "./markdown-text";
import {
  DestinationCard,
  type DestinationInfo,
} from "./travel/destination-card";
import { ItineraryCard, type ItineraryData } from "./travel/itinerary-card";

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

        // Return the points of interest card to the client.
        return <MapCard city={poi} data={pointsOfInterest} />;
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
   - Call this tool when you have: destination name + duration (e.g., "Tokyo for 4 days")
   - If conversation context provides this info, use it immediately
   
2. get_destination_info - REQUIRED for destination information requests (e.g., "tell me about Paris", "best time to visit Rome")${
        process.env.EXPO_OS !== "web"
          ? "\n3. get_points_of_interest - REQUIRED to find real places, restaurants, and attractions"
          : ""
      }

IMPORTANT RULES: 
- ALWAYS use these tools for travel requests - they create beautiful interactive cards
- NEVER respond with plain text for travel planning or destination queries
- When you have enough information (destination + duration), call create_itinerary immediately
- If the user provides additional details in follow-up messages (like "4 days" or "3 days"), combine it with previous context to call the tool
- Look at the conversation history to understand context - if user previously mentioned a destination, use it
- Do NOT ask for information and then fail to use the tools when the user provides it`,
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
            "Creates a detailed day-by-day travel itinerary for any trip planning request. Use this tool when the user asks about planning a trip, creating an itinerary, or wants to know what to do during their visit to a destination. You only need to provide the destination and duration - the tool will generate the detailed itinerary.",
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
              .optional()
              .describe(
                "Day-by-day itinerary with real places (optional - will be generated if not provided)"
              ),
          }),
          generate: async function* (args: {
            destination: string;
            duration: string;
            days?: any[];
          }) {
            const { destination, duration, days } = args;
            console.log(
              "[create_itinerary] Called with destination:",
              destination,
              "duration:",
              duration,
              "days provided:",
              !!days
            );

            yield (
              <MarkdownText>
                Creating your {duration} itinerary for {destination}...
              </MarkdownText>
            );

            let itineraryDays = days;

            // If days not provided, generate them using AI
            if (!itineraryDays || itineraryDays.length === 0) {
              console.log("[create_itinerary] Generating itinerary with AI...");

              // Parse duration to get number of days
              const durationMatch = duration.match(/(\d+)/);
              const numDays = durationMatch ? parseInt(durationMatch[1]) : 3;

              try {
                const result = await generateObject({
                  model: vertex("gemini-2.5-flash-lite") as any,
                  schema: z.object({
                    days: z.array(
                      z.object({
                        day: z.number(),
                        title: z.string(),
                        activities: z.array(
                          z.object({
                            time: z.string(),
                            activity: z.string(),
                            location: z.string(),
                            notes: z.string().optional(),
                          })
                        ),
                      })
                    ),
                  }),
                  prompt: `Create a detailed ${numDays}-day travel itinerary for ${destination}. Include specific real places, attractions, restaurants, and activities. Each day should have 4-6 activities with realistic times. Use actual place names and popular attractions in ${destination}.`,
                });

                itineraryDays = result.object.days;
                console.log(
                  "[create_itinerary] Generated",
                  itineraryDays.length,
                  "days"
                );
              } catch (error) {
                console.error(
                  "[create_itinerary] Error generating itinerary:",
                  error
                );
                // Fallback to simple structure
                itineraryDays = Array.from({ length: numDays }, (_, i) => ({
                  day: i + 1,
                  title: `Day ${i + 1} in ${destination}`,
                  activities: [
                    {
                      time: "9:00 AM",
                      activity: "Morning Exploration",
                      location: destination,
                    },
                    {
                      time: "12:00 PM",
                      activity: "Lunch at Local Restaurant",
                      location: destination,
                    },
                    {
                      time: "2:00 PM",
                      activity: "Afternoon Activities",
                      location: destination,
                    },
                    {
                      time: "7:00 PM",
                      activity: "Dinner",
                      location: destination,
                    },
                  ],
                }));
              }
            }

            const itineraryData: ItineraryData = {
              destination,
              duration,
              days: itineraryDays,
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
