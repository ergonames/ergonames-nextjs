import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "ErgoNames — your name on Ergo",
  description: "Register a human-readable name on the Ergo blockchain.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans hex-bg aura" style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
