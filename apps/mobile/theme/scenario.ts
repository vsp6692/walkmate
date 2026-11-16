export const places = ["Neighborhood", "Seaside", "Trail", "Sunset"] as const;
export type Place = (typeof places)[number];
const palettes = {
  peach: {
    background: "#FFF8F3",
    surface: "#FFFFFF",
    wash: "#FBE4D8",
    ink: "#3F2929",
    muted: "#795F59",
    accent: "#A84435",
    line: "#E8CCC1",
  },
  blue: {
    background: "#F5F8FC",
    surface: "#FFFFFF",
    wash: "#DBE8F4",
    ink: "#243749",
    muted: "#576C80",
    accent: "#335D86",
    line: "#C5D6E5",
  },
  coast: {
    background: "#F6FAFC",
    surface: "#FFFFFF",
    wash: "#DCEEF5",
    ink: "#213D51",
    muted: "#536F80",
    accent: "#246B8A",
    line: "#BDD9E6",
  },
  earth: {
    background: "#FAF7F1",
    surface: "#FFFFFF",
    wash: "#EDE0CC",
    ink: "#42372C",
    muted: "#746451",
    accent: "#805538",
    line: "#DDCCB5",
  },
  sunset: {
    background: "#FFF7F4",
    surface: "#FFFFFF",
    wash: "#F8DCD6",
    ink: "#4F2D3C",
    muted: "#805B69",
    accent: "#A0405A",
    line: "#E9BFC5",
  },
  energy: {
    background: "#FFF8F2",
    surface: "#FFFFFF",
    wash: "#FFE2C8",
    ink: "#4B3027",
    muted: "#805E50",
    accent: "#A4471D",
    line: "#EFCCB0",
  },
  quiet: {
    background: "#F8F6FC",
    surface: "#FFFFFF",
    wash: "#E9E1F5",
    ink: "#3D3454",
    muted: "#716381",
    accent: "#6D4F95",
    line: "#D8CCE8",
  },
  dream: {
    background: "#F4F5FC",
    surface: "#FFFFFF",
    wash: "#DFE2FA",
    ink: "#30345C",
    muted: "#64688C",
    accent: "#5451A8",
    line: "#C9CCEC",
  },
};
export type Palette = typeof palettes.peach;
export function scenario(person: number, activity: number, place: Place) {
  if (activity === 1)
    return {
      palette: palettes.energy,
      label: "A little fire",
      title: "Find your rhythm.\nFeel your energy.",
      symbol: "✺",
    };
  if (activity === 2)
    return {
      palette: palettes.quiet,
      label: "Soft landing",
      title: "Slow down.\nYou’re in good company.",
      symbol: "☾",
    };
  if (activity === 3)
    return {
      palette: palettes.dream,
      label: "Somewhere unexpected",
      title: "A different world.\nA familiar friend.",
      symbol: "✧",
    };
  if (place === "Seaside")
    return {
      palette: palettes.coast,
      label: "Salt air & open skies",
      title: "Follow the breeze.\nLeave a little lighter.",
      symbol: "≈",
    };
  if (place === "Trail")
    return {
      palette: palettes.earth,
      label: "The scenic way",
      title: "Take the winding path.\nFind a little wonder.",
      symbol: "⌁",
    };
  if (place === "Sunset")
    return {
      palette: palettes.sunset,
      label: "The golden hour",
      title: "Chase the last light.\nStay for the stories.",
      symbol: "◒",
    };
  return person === 0
    ? {
        palette: palettes.peach,
        label: "Peach skies with Maya",
        title: "A little sunshine.\nA story worth sharing.",
        symbol: "☀",
      }
    : {
        palette: palettes.blue,
        label: "Open skies with Arjun",
        title: "A fresh perspective.\nAn adventure together.",
        symbol: "↗",
      };
}
