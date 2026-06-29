"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// The interface is a single light monochrome-graphite system; there is no
// dark variant. next-themes stays mounted (other code may read it) but the
// theme is forced light so nothing can flip the surfaces.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
