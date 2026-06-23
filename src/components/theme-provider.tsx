"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Toggles a `.dark` class on <html>; `.dark .theme-insight` (globals.css)
// supplies the warm-stone dark tokens. Defaults to light.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
