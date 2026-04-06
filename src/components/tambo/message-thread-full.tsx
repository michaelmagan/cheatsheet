"use client";

import type { Suggestion } from "@tambo-ai/react";
import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputError,
  MessageInputFileButton,
  MessageInputMcpPromptButton,
  MessageInputMcpResourceButton,
  MessageInputStopButton,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import {
  ThreadHistory,
  ThreadHistoryHeader,
  ThreadHistoryList,
  ThreadHistoryNewButton,
  ThreadHistorySearch,
  useThreadHistoryContext,
} from "@/components/tambo/thread-history";
import { useMergeRefs } from "@/lib/thread-hooks";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { GithubIcon } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { ThreadContainer, useThreadContainerContext } from "./thread-container";

/**
 * GitHub button component for the sidebar
 */
const GitHubButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ ...props }, ref) => {
  const { isCollapsed } = useThreadHistoryContext();

  const githubRepoUrl = "https://github.com/michaelmagan/cheatsheet";

  return (
    <a
      ref={ref}
      href={githubRepoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center rounded-md mb-4 hover:bg-backdrop transition-colors cursor-pointer relative",
        isCollapsed ? "p-1 justify-center" : "p-2 gap-2",
      )}
      title="View on GitHub"
      {...props}
    >
      <GithubIcon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap absolute left-8 pb-[2px]",
          isCollapsed
            ? "opacity-0 max-w-0 overflow-hidden pointer-events-none"
            : "opacity-100 transition-all duration-300 delay-100",
        )}
      >
        GitHub Repo
      </span>
    </a>
  );
});
GitHubButton.displayName = "GitHubButton";

/**
 * Tambo button component for the sidebar
 */
const TamboButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ ...props }, ref) => {
  const { isCollapsed } = useThreadHistoryContext();

  const tamboUrl = "https://tambo.co";

  return (
    <a
      ref={ref}
      href={tamboUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center rounded-md mb-4 hover:bg-backdrop transition-colors cursor-pointer relative",
        isCollapsed ? "p-1 justify-center" : "p-2 gap-2",
      )}
      title="Built with Tambo"
      {...props}
    >
      <Image
        src="/Octo-Icon.svg"
        alt="Tambo"
        width={16}
        height={16}
        className="text-muted-foreground hover:text-foreground transition-colors"
      />
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap absolute left-8 pb-[2px]",
          isCollapsed
            ? "opacity-0 max-w-0 overflow-hidden pointer-events-none"
            : "opacity-100 transition-all duration-300 delay-100",
        )}
      >
        Built with Tambo AI
      </span>
    </a>
  );
});
TamboButton.displayName = "TamboButton";

/**
 * Props for the MessageThreadFull component
 */
export interface MessageThreadFullProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls the visual styling of messages in the thread.
   * Possible values include: "default", "compact", etc.
   * These values are defined in messageVariants from "@/components/tambo/message".
   * @example variant="compact"
   */
  variant?: VariantProps<typeof messageVariants>["variant"];
  /** Optional starter suggestions shown before conversation begins. When omitted, no starter suggestions are shown. */
  initialSuggestions?: Suggestion[];
}

/**
 * A full-screen chat thread component with message history, input, and suggestions
 */
export const MessageThreadFull = React.forwardRef<
  HTMLDivElement,
  MessageThreadFullProps
>(({ className, variant, ...props }, ref) => {
  const { containerRef, historyPosition } = useThreadContainerContext();
  const mergedRef = useMergeRefs<HTMLDivElement | null>(ref, containerRef);
  const { initialSuggestions, ...restProps } = props;

  const defaultSuggestions: Suggestion[] = [
    {
      id: "suggestion-1",
      title: "Get started",
      description: "What can you help me with?",
      detailedSuggestion: "What can you help me with?",
      messageId: "welcome-query",
    },
    {
      id: "suggestion-2",
      title: "Learn more",
      description: "Tell me about your capabilities.",
      detailedSuggestion: "Tell me about your capabilities.",
      messageId: "capabilities-query",
    },
    {
      id: "suggestion-3",
      title: "Examples",
      description: "Show me some example queries I can try.",
      detailedSuggestion: "Show me some example queries I can try.",
      messageId: "examples-query",
    },
  ];

  const threadHistorySidebar = (
    <ThreadHistory position={historyPosition}>
      <ThreadHistoryHeader />
      <GitHubButton />
      <TamboButton />
      <ThreadHistoryNewButton />
      <ThreadHistorySearch />
      <ThreadHistoryList />
    </ThreadHistory>
  );

  return (
    <div className="flex h-full w-full">
      {/* Thread History Sidebar - rendered first if history is on the left */}
      {historyPosition === "left" && threadHistorySidebar}

      <ThreadContainer
        ref={mergedRef}
        disableSidebarSpacing
        className={className}
        {...restProps}
      >
        <ScrollableMessageContainer className="p-4">
          <ThreadContent variant={variant}>
            <ThreadContentMessages />
          </ThreadContent>
        </ScrollableMessageContainer>

        {/* Message suggestions status */}
        <MessageSuggestions>
          <MessageSuggestionsStatus />
        </MessageSuggestions>

        {/* Message input */}
        <div className="px-4 pb-4">
          <MessageInput>
            <MessageInputTextarea placeholder="Type your message or paste images..." />
            <MessageInputToolbar>
              <MessageInputFileButton />
              <MessageInputMcpPromptButton />
              <MessageInputMcpResourceButton />
              {/* Uncomment this to enable client-side MCP config modal button */}
              {/* <MessageInputMcpConfigButton /> */}
              <MessageInputSubmitButton />
              <MessageInputStopButton />
            </MessageInputToolbar>
            <MessageInputError />
          </MessageInput>
        </div>

        {/* Message suggestions */}
        <MessageSuggestions initialSuggestions={initialSuggestions ?? defaultSuggestions}>
          <MessageSuggestionsList />
        </MessageSuggestions>
      </ThreadContainer>

      {/* Thread History Sidebar - rendered last if history is on the right */}
      {historyPosition === "right" && threadHistorySidebar}
    </div>
  );
});
MessageThreadFull.displayName = "MessageThreadFull";
