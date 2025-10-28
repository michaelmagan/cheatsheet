"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

interface ApiKeyCheckProps {
  children: React.ReactNode;
}

export function ApiKeyCheck({ children }: ApiKeyCheckProps) {
  const [showApiKeyAlert, setShowApiKeyAlert] = useState(!process.env.NEXT_PUBLIC_TAMBO_API_KEY);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!showApiKeyAlert) {
    return <>{children}</>;
  }

  return (
    <>
      {/* API Key Missing Alert */}
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
        <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full p-6 relative">
          <button
            onClick={() => setShowApiKeyAlert(false)}
            className="absolute top-4 right-4 p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold mb-4">Tambo API Key Required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            To get started, you need to initialize Tambo:
          </p>
          <div className="flex items-center gap-2 bg-muted p-3 rounded-md mb-4">
            <code className="text-sm flex-grow">npx tambo init</code>
            <button
              onClick={() => copyToClipboard("npx tambo init")}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              title="Copy to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Or visit{" "}
            <a
              href="https://tambo.co/cli-auth"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              tambo.co/cli-auth
            </a>{" "}
            to get your API key and set it in{" "}
            <code className="bg-muted px-2 py-1 rounded text-xs">.env.local</code>
          </p>
        </div>
      </div>
      {children}
    </>
  );
}
