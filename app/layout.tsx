import type { Metadata } from "next";
import "./globals.css";
import "antd/dist/reset.css";

export const metadata: Metadata = {
  title: "指数分析",
  description: "展示 ETF 行业资金流向与估值",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
