import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Tempest Sentinel · Encrypted Weather Intelligence",
  description:
    "Tempest Sentinel：全新 FHEVM 加密极端天气情报平台，支持本地 Mock 与 Relayer SDK，连接 TempestSentinel 合约完成隐私保护的气象脉冲登记与审阅。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
