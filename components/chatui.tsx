"use client";

import { useActions, useAIState, useUIState } from "@ai-sdk/rsc";
import React from "react";
import { View } from "react-native";

import { Stack } from "expo-router";
import { AI } from "./ai-context";
import { ChatToolbarInner } from "./chat-toolbar";
import { KeyboardFriendlyScrollView } from "./keyboard-friendly-scrollview";
import { HeaderButton } from "./ui/Header";
import { IconSymbol } from "./ui/IconSymbol";

import * as AC from "@bacons/apple-colors";

import { nanoid } from "@/util/nanoid";
import { tw } from "@/util/tw";
import { ChatContainer } from "./chat-container";

const HEADER_HEIGHT = 0;

function MessagesScrollView() {
  const [messages] = useUIState<typeof AI>();

  const textInputHeight = 8 + 36;

  console.log(
    "[MessagesScrollView] Rendering with message count:",
    messages.length
  );

  return (
    <>
      <KeyboardFriendlyScrollView
        style={[{ flex: 1 }, tw`md:w-[768px] max-w-[768px] md:mx-auto`]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 24,
          paddingBottom: textInputHeight,
          gap: 8,
          flex: messages.length ? undefined : 1,
        }}
      >
        {
          // View messages in UI state
          messages.map((message, index) => {
            console.log(
              "[MessagesScrollView] Rendering message",
              index,
              "id:",
              message.id,
              "display type:",
              typeof message.display,
              "is React element:",
              !!message.display &&
                typeof message.display === "object" &&
                "$$typeof" in message.display
            );
            return <View key={message.id}>{message.display}</View>;
          })
        }
      </KeyboardFriendlyScrollView>
    </>
  );
}

export function ChatUI() {
  const [, setAIState] = useAIState<typeof AI>();
  const [messages, setMessages] = useUIState<typeof AI>();

  return (
    <ChatContainer>
      <Stack.Screen
        options={{
          headerRight: () =>
            !!messages.length ? (
              <>
                {!!messages.length && (
                  <HeaderButton
                    pressOpacity={0.7}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      marginLeft: 2,
                    }}
                    onPress={() => {
                      setAIState({ chatId: nanoid(), messages: [] });
                      setMessages([]);
                    }}
                  >
                    <IconSymbol name="square.and.pencil" color={AC.label} />
                  </HeaderButton>
                )}
              </>
            ) : null,
        }}
      />

      <MessagesScrollView />

      <ChatToolbar />
    </ChatContainer>
  );
}

function ChatToolbar() {
  const [messages, setMessages] = useUIState<typeof AI>();
  const { onSubmit } = useActions<typeof AI>();

  return (
    <ChatToolbarInner
      messages={messages}
      setMessages={setMessages}
      onSubmit={onSubmit}
    />
  );
}
