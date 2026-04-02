import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
          paddingBottom: "72px",
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
  );
}
