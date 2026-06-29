import type { NodeType } from "../types";

export const NODE_META: Record<NodeType, { ic: string; lbl: string }> = {
  fight: { ic: "⚔", lbl: "Бій" },
  elite: { ic: "☠", lbl: "Еліт" },
  shop: { ic: "🛒", lbl: "Магазин" },
  event: { ic: "❓", lbl: "Подія" },
  campfire: { ic: "🔥", lbl: "Багаття" },
  boss: { ic: "👑", lbl: "Бос" },
};
