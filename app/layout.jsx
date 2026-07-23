import "./globals.css";

export const metadata = {
  title: "SST-IDP Pop Science Articles",
  description: "SST-IDP popular-science article archive.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
