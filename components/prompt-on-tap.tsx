"use client";

import type { AI } from "@/components/ai-context";
import { useActions, useUIState } from "@ai-sdk/rsc";
import { useCallback } from "react";
import { TouchableOpacityProps } from "react-native";
import TouchableBounce from "./ui/TouchableBounce";
import { UserMessage } from "./user-message";

export function PromptOnTap({
  prompt,
  onPress,
  ...props
}: { prompt: string | [string, string] } & TouchableOpacityProps) {
  const onPressPrompt = usePromptOnPress(prompt);
  return (
    <TouchableBounce
      {...props}
      sensory
      onPress={async (e) => {
        onPress?.(e);
        onPressPrompt();
      }}
    />
  );
}

function usePromptOnPress(prompt: string | [string, string]) {
  const [, setMessages] = useUIState<typeof AI>();
  const { onSubmit } = useActions<typeof AI>();

  return useCallback(async () => {
    const [displayPrompt, detailedPrompt] = Array.isArray(prompt)
      ? prompt
      : [prompt, prompt];
    console.log("[PromptOnTap] Adding user message:", displayPrompt);
    setMessages((currentMessages: any[]) => [
      ...currentMessages,
      {
        id: Date.now(),
        display: <UserMessage>{displayPrompt}</UserMessage>,
      },
    ]);
    console.log("[PromptOnTap] Calling onSubmit with:", detailedPrompt);
    try {
      const responseDisplay = await onSubmit(detailedPrompt);
      console.log("[PromptOnTap] Got response, type:", typeof responseDisplay);
      console.log(
        "[PromptOnTap] Response is React element:",
        !!responseDisplay &&
          typeof responseDisplay === "object" &&
          "$$typeof" in responseDisplay
      );

      // Don't add null or undefined responses
      if (!responseDisplay) {
        console.log("[PromptOnTap] Skipping null/undefined response");
        return;
      }

      const responseMessage: { id: number; display: React.ReactNode } = {
        id: Date.now(),
        display: responseDisplay as React.ReactNode,
      };

      console.log("[PromptOnTap] Created response message:", {
        id: responseMessage.id,
        hasDisplay: !!responseMessage.display,
        displayType: typeof responseMessage.display,
      });

      setMessages((currentMessages: any[]) => {
        console.log(
          "[PromptOnTap] Adding response to messages, current count:",
          currentMessages.length
        );
        const newMessages = [...currentMessages, responseMessage];
        console.log("[PromptOnTap] New message count:", newMessages.length);
        return newMessages;
      });
      console.log("[PromptOnTap] Response added to messages");
    } catch (error) {
      console.error("[PromptOnTap] Error calling onSubmit:", error);
    }
  }, [setMessages, onSubmit, prompt]);
}
