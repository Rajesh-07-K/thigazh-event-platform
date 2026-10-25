import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminConsoleView from "@/components/AdminConsoleView";

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/auth/signin?redirect=/admin");
  }

  if (session.role !== "ADMIN") {
    redirect("/account");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <AdminConsoleView />
    </div>
  );
}
