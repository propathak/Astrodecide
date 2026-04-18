import BottomNav from "@/components/BottomNav";
import { OracleProvider } from "@/contexts/OracleContext";
import { ProfileProvider } from "@/contexts/ProfileContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
    <OracleProvider>
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main
          style={{
            flex: 1,
            paddingBottom: "96px", // space for floating pill nav
            maxWidth: "430px",
            margin: "0 auto",
            width: "100%",
          }}
          className="fade-in"
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </OracleProvider>
    </ProfileProvider>
  );
}
