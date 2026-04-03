export function HeroAurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-[20%] top-[10%] h-[500px] w-[500px] rounded-full opacity-70"
        style={{
          background: "radial-gradient(circle, rgba(124,92,252,0.3) 0%, transparent 60%)",
          filter: "blur(90px)",
          animation: "aurora-drift-1 12s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -right-[15%] top-[25%] h-[400px] w-[400px] rounded-full opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(80,100,252,0.25) 0%, transparent 55%)",
          filter: "blur(80px)",
          animation: "aurora-drift-2 10s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute left-[10%] top-[55%] h-[350px] w-[350px] rounded-full opacity-50"
        style={{
          background: "radial-gradient(circle, rgba(160,80,252,0.2) 0%, transparent 55%)",
          filter: "blur(100px)",
          animation: "aurora-drift-3 14s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes aurora-drift-1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(8%, 12%) scale(1.15); }
        }
        @keyframes aurora-drift-2 {
          0% { transform: translate(0, 0) scale(1.1); }
          100% { transform: translate(-12%, -8%) scale(0.9); }
        }
        @keyframes aurora-drift-3 {
          0% { transform: translate(0, 0) scale(0.9); }
          100% { transform: translate(10%, -15%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
