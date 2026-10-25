"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#FAF8F5] text-[#231124] min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 shadow-lg p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Unexpected Error</h2>
          <p className="text-sm text-neutral-600">
            A critical server error occurred. Please refresh or try again.
          </p>
          {error?.digest && (
            <p className="text-xs font-mono text-neutral-400 bg-neutral-100 p-2 rounded">
              Error Digest: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-[#231124] text-white rounded-xl text-sm font-semibold hover:bg-neutral-800"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
