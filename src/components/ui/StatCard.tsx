interface StatCardProps {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "red" | "yellow" | "gold" | "gray";
  sub?: string;
  icon?: React.ReactNode;
  trend?: string;
}

const accentColors: Record<string, string> = {
  blue:   "#3B82F6",
  green:  "#22C55E",
  red:    "#EF4444",
  yellow: "#EAB308",
  gold:   "var(--gold)",
  gray:   "#94A3B8",
};

export default function StatCard({ label, value, color = "gold", sub, icon }: StatCardProps) {
  const accent = accentColors[color] ?? accentColors.gold;

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.12)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.18)",
      borderRadius: 20,
      padding: "28px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(10, 22, 40, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      cursor: "pointer"
    }}>
      {/* Decorative glow circle */}
      <div style={{
        position: "absolute",
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Bottom accent line */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)`,
        opacity: 0.5,
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: "0.68rem", 
            fontWeight: 700, 
            letterSpacing: "0.08em", 
            textTransform: "uppercase", 
            color: "rgba(71, 85, 105, 0.7)", 
            marginBottom: 10 
          }}>
            {label}
          </div>
          <div style={{ 
            fontFamily: "var(--font-display)", 
            fontSize: "2.4rem", 
            fontWeight: 700, 
            color: "var(--navy)", 
            lineHeight: 1,
            marginBottom: 8
          }}>
            {value}
          </div>
          {sub && (
            <div style={{ 
              fontSize: "0.8rem", 
              color: "var(--slate)",
              fontWeight: 500
            }}>
              {sub}
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${accent}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
            flexShrink: 0,
            border: `1px solid ${accent}30`,
            boxShadow: `0 0 20px ${accent}15`,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
