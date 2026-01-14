import { Protected } from "./components/Protected";
import { MainLayout } from "./components/MainLayout";

export default function DashboardPage() {
  return (
    <Protected>
      <MainLayout>
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>Your main content goes here...</p>
      </MainLayout>
    </Protected>
  );
}
