"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Ink toast: dark graphite surface, white mono message, green check.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#9FE8B8]" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        style: {
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: "12.5px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
        },
      }}
      style={
        {
          "--normal-bg": "#0E1116",
          "--normal-text": "#FFFFFF",
          "--normal-border": "#0E1116",
          "--border-radius": "2px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
