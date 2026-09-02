"use client";

/**
 * INDIA'S JOURNEY BEYOND EARTH — Error Boundary
 *
 * Implements Section #24 (Error Handling) of the Master Prompt:
 * "If a 3D model fails: Do not crash the website. Show a fallback:
 *  3D MODEL UNAVAILABLE and continue the experience."
 */
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Box } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  is3DScene?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.is3DScene) {
        return (
          <div className="fixed inset-0 z-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white">
            <div className="rounded-2xl glass-panel p-8 max-w-md space-y-4 border border-blue-500/30">
              <Box className="h-12 w-12 text-blue-400 mx-auto animate-pulse" />
              <h3 className="font-display text-xl font-bold text-white">
                {this.props.fallbackTitle || "3D GRAPHICS FALLBACK ACTIVE"}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                {this.props.fallbackMessage ||
                  "3D WebGL rendering encountered a hardware/memory limit. The mission narrative and explorer remains fully accessible."}
              </p>
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-400 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry 3D Engine</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="rounded-2xl glass-panel p-8 text-center text-white my-6 border border-red-500/30">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold">
            {this.props.fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {this.props.fallbackMessage || "Mission information temporarily unavailable."}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reload Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
