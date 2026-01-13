"use client";

import { useChat } from "@ai-sdk/react";
import { useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { generateUUID } from "@/lib/utils";

export default function WidgetPage() {
  // Stable chat ID that doesn't change on re-renders
  const chatId = useMemo(() => generateUUID(), []);
  
  // Manage input state manually (required in AI SDK 5.0+)
  const [input, setInput] = useState("");
  
  const { messages, sendMessage, status } = useChat({
    id: chatId,
    generateId: generateUUID,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const text = input;
    setInput(""); // Clear input immediately
    
    await sendMessage({ text });
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Poverty Stoplight Data Assistant"
              description="Ask me about poverty indicators, survey data, or trends across regions."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    message.parts?.map((part, i) => {
                      const key = `${message.id}-${i}`;
                      
                      if (part.type === "text") {
                        return (
                          <MessageResponse key={key}>
                            {part.text}
                          </MessageResponse>
                        );
                      }
                      
                      // Handle tool calls
                      if (part.type === "tool-invocation") {
                        const toolPart = part as {
                          type: string;
                          toolInvocationId?: string;
                          toolName?: string;
                          state?: string;
                          args?: unknown;
                          result?: unknown;
                        };
                        
                        return (
                          <div key={toolPart.toolInvocationId || key} className="my-2 p-2 bg-muted rounded text-xs">
                            <div className="font-medium text-muted-foreground">
                              Tool: {toolPart.toolName}
                              {toolPart.state && ` (${toolPart.state})`}
                            </div>
                            {toolPart.state === "result" && toolPart.result && (
                              <pre className="mt-1 overflow-auto max-h-48">
                                {JSON.stringify(toolPart.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      }
                      
                      return null;
                    })
                  ) : (
                    message.parts?.map((part, i) =>
                      part.type === "text" ? (
                        <span key={`${message.id}-${i}`}>{part.text}</span>
                      ) : null
                    )
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
      </Conversation>

      <div className="border-t p-4">
        <PromptInput
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl"
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about poverty data..."
            disabled={isLoading}
          />
          <PromptInputFooter>
            <div />
            <PromptInputSubmit disabled={isLoading || !input.trim()} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
