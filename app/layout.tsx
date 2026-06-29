import type { Metadata, Viewport } from "next";
import { Cinzel, Lora } from "next/font/google";
import "./globals.css";
import { Bgfx } from "@/components/Bgfx";

// Display: Cinzel (engraved Roman caps) for latin titles. Body: Lora — a serif
// with Cyrillic coverage for the Ukrainian UI text.
const display = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const body = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deckforge — roguelike deckbuilder",
  description: "Темне фентезі roguelike-deckbuilder. 8 героїв, 4 акти, групи ворогів, реліквії.",
  applicationName: "Deckforge",
  openGraph: {
    title: "Deckforge",
    description: "Темне фентезі roguelike-deckbuilder. 8 героїв, 4 акти, реліквії.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#100a05",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* Material Symbols (chrome icons). display=block hides the ligature
            text until the font loads, so we never flash icon names. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0&display=block"
        />
      </head>
      <body className="act1">
        <Bgfx />
        {children}
      </body>
    </html>
  );
}
