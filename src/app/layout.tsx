import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Butterlogs",
  description: "Recipe scaling and costing for bakers",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
