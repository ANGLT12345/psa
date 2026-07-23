import Archive from "@/components/Archive";

/* Public, read-only catalogue. No upload, no remove, no technical labels. */
export default function Page() {
  return <Archive admin={false} />;
}
