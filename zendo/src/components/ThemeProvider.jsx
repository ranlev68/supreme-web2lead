import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "system", setTheme: () => {}, mobileFontSize: "normal", setMobileFontSize: () => {}, fontFamily: "inter", setFontFamily: () => {}, palette: "slate", setPalette: () => {} });

const THEME_KEY = "zendo_theme";
const FONT_SIZE_KEY = "zendo_mobile_font_size";
const FONT_FAMILY_KEY = "zendo_font_family";
const PALETTE_KEY = "zendo_palette";

// Font size scale: normal = 100%, large = 112.5%, xlarge = 125%
const FONT_SIZE_SCALES = { normal: "100%", large: "112.5%", xlarge: "125%" };

const FONT_IMPORTS = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  geist: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap",
  jakarta: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
};
const FONT_STACKS = {
  inter: "'Inter', sans-serif",
  geist: "'Geist', sans-serif",
  jakarta: "'Plus Jakarta Sans', sans-serif",
};

// Pastel palettes — each sets full light + dark CSS variable sets
export const PALETTES = {
  slate: {
    label: "Slate",
    description: "Soft blue-grey",
    swatch: ["#b8c8e8", "#d4e4f7", "#e8d5f0"],
    light: {
      "--background": "210 25% 97%",
      "--foreground": "220 20% 18%",
      "--card": "0 0% 100%",
      "--card-foreground": "220 20% 18%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "220 20% 18%",
      "--primary": "213 55% 52%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 30% 92%",
      "--secondary-foreground": "220 20% 25%",
      "--muted": "210 25% 94%",
      "--muted-foreground": "215 15% 50%",
      "--accent": "210 30% 90%",
      "--accent-foreground": "220 20% 18%",
      "--border": "210 20% 88%",
      "--input": "210 20% 88%",
      "--ring": "213 55% 52%",
    },
    dark: {
      "--background": "220 22% 13%",
      "--foreground": "210 20% 92%",
      "--card": "220 22% 17%",
      "--card-foreground": "210 20% 92%",
      "--popover": "220 22% 17%",
      "--popover-foreground": "210 20% 92%",
      "--primary": "213 55% 62%",
      "--primary-foreground": "220 22% 13%",
      "--secondary": "220 22% 22%",
      "--secondary-foreground": "210 20% 92%",
      "--muted": "220 22% 22%",
      "--muted-foreground": "215 15% 58%",
      "--accent": "220 22% 25%",
      "--accent-foreground": "210 20% 92%",
      "--border": "220 22% 28%",
      "--input": "220 22% 28%",
      "--ring": "213 55% 62%",
    },
  },
  rose: {
    label: "Rose",
    description: "Warm blush & mauve",
    swatch: ["#f5c6d0", "#fde8d8", "#e8d5e8"],
    light: {
      "--background": "340 30% 97%",
      "--foreground": "335 25% 16%",
      "--card": "0 0% 100%",
      "--card-foreground": "335 25% 16%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "335 25% 16%",
      "--primary": "340 60% 55%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "340 25% 92%",
      "--secondary-foreground": "335 25% 22%",
      "--muted": "340 20% 94%",
      "--muted-foreground": "335 12% 50%",
      "--accent": "340 25% 90%",
      "--accent-foreground": "335 25% 16%",
      "--border": "340 18% 88%",
      "--input": "340 18% 88%",
      "--ring": "340 60% 55%",
    },
    dark: {
      "--background": "335 18% 12%",
      "--foreground": "340 20% 92%",
      "--card": "335 18% 16%",
      "--card-foreground": "340 20% 92%",
      "--popover": "335 18% 16%",
      "--popover-foreground": "340 20% 92%",
      "--primary": "340 60% 65%",
      "--primary-foreground": "335 18% 12%",
      "--secondary": "335 18% 21%",
      "--secondary-foreground": "340 20% 92%",
      "--muted": "335 18% 21%",
      "--muted-foreground": "335 12% 58%",
      "--accent": "335 18% 24%",
      "--accent-foreground": "340 20% 92%",
      "--border": "335 18% 27%",
      "--input": "335 18% 27%",
      "--ring": "340 60% 65%",
    },
  },
  sage: {
    label: "Sage",
    description: "Muted green & mint",
    swatch: ["#b8d8c8", "#d8ecd0", "#c8dfe8"],
    light: {
      "--background": "140 20% 97%",
      "--foreground": "150 22% 15%",
      "--card": "0 0% 100%",
      "--card-foreground": "150 22% 15%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "150 22% 15%",
      "--primary": "152 42% 42%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "140 22% 91%",
      "--secondary-foreground": "150 22% 22%",
      "--muted": "140 18% 93%",
      "--muted-foreground": "148 12% 50%",
      "--accent": "140 22% 89%",
      "--accent-foreground": "150 22% 15%",
      "--border": "140 16% 87%",
      "--input": "140 16% 87%",
      "--ring": "152 42% 42%",
    },
    dark: {
      "--background": "150 18% 11%",
      "--foreground": "140 18% 91%",
      "--card": "150 18% 15%",
      "--card-foreground": "140 18% 91%",
      "--popover": "150 18% 15%",
      "--popover-foreground": "140 18% 91%",
      "--primary": "152 42% 55%",
      "--primary-foreground": "150 18% 11%",
      "--secondary": "150 18% 20%",
      "--secondary-foreground": "140 18% 91%",
      "--muted": "150 18% 20%",
      "--muted-foreground": "148 12% 57%",
      "--accent": "150 18% 23%",
      "--accent-foreground": "140 18% 91%",
      "--border": "150 18% 26%",
      "--input": "150 18% 26%",
      "--ring": "152 42% 55%",
    },
  },
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "light"; } catch { return "light"; }
  });
  const [mobileFontSize, setMobileFontSizeState] = useState(() => {
    try { return localStorage.getItem(FONT_SIZE_KEY) || "normal"; } catch { return "normal"; }
  });
  const [fontFamily, setFontFamilyState] = useState(() => {
    try { return localStorage.getItem(FONT_FAMILY_KEY) || "inter"; } catch { return "inter"; }
  });
  const [palette, setPaletteState] = useState(() => {
    try { return localStorage.getItem(PALETTE_KEY) || "slate"; } catch { return "slate"; }
  });

  useEffect(() => {
    const root = document.documentElement;
    const applyDark = (dark) => {
      root.classList.toggle("dark", dark);
    };

    if (theme === "dark") {
      applyDark(true);
    } else if (theme === "light") {
      applyDark(false);
    } else {
      // system
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyDark(mq.matches);
      const handler = (e) => applyDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Apply font family
  useEffect(() => {
    // Inject google fonts link if not present
    const id = `zendo-font-${fontFamily}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = FONT_IMPORTS[fontFamily];
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty("--font-app", FONT_STACKS[fontFamily] || FONT_STACKS.inter);
    document.body.style.fontFamily = FONT_STACKS[fontFamily] || FONT_STACKS.inter;
  }, [fontFamily]);

  // Apply palette — inject a <style> tag so it wins over @layer base rules
  useEffect(() => {
    const pal = PALETTES[palette] || PALETTES.slate;
    let isDark;
    if (theme === "dark") {
      isDark = true;
    } else if (theme === "light") {
      isDark = false;
    } else {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    const vars = isDark ? pal.dark : pal.light;
    const css = `:root { ${Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(" ")} }`;
    let styleEl = document.getElementById("zendo-palette-vars");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "zendo-palette-vars";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, [palette, theme]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const scale = FONT_SIZE_SCALES[mobileFontSize] || "100%";
    if (isMobile) {
      document.documentElement.style.fontSize = scale;
    }
    // Also watch for resize changes
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e) => {
      document.documentElement.style.fontSize = e.matches ? scale : "";
    };
    mq.addEventListener("change", handler);
    return () => {
      mq.removeEventListener("change", handler);
    };
  }, [mobileFontSize]);

  const setTheme = (t) => {
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    setThemeState(t);
  };

  const setMobileFontSize = (s) => {
    try { localStorage.setItem(FONT_SIZE_KEY, s); } catch {}
    setMobileFontSizeState(s);
  };

  const setFontFamily = (f) => {
    try { localStorage.setItem(FONT_FAMILY_KEY, f); } catch {}
    setFontFamilyState(f);
  };

  const setPalette = (p) => {
    try { localStorage.setItem(PALETTE_KEY, p); } catch {}
    setPaletteState(p);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mobileFontSize, setMobileFontSize, fontFamily, setFontFamily, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}