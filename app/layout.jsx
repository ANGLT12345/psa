import "./globals.css";

export const metadata = {
  title: "The Archive",
  description: "A PDF document archive backed by Cloudflare R2 and Supabase.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
