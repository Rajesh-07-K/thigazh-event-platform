import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import OrganizerAnalyticsView from "@/components/OrganizerAnalyticsView";

export const revalidate = 0;

export default async function OrganizerDashboardPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/auth/signin?redirect=/organizer");
  }

  if (session.role !== "ORGANIZER" && session.role !== "ADMIN") {
    redirect("/account");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <OrganizerAnalyticsView />
    </div>
  );
}
