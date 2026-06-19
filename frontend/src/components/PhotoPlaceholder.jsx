import { UtensilsCrossed } from "lucide-react";

// Neutral, muted placeholder for ANY scored card without a photo.
// Identical for every category by design — the category is already shown by
// the card's badge; this just fills the photo box and recedes behind real
// photos. Do not vary it by dish.
export default function PhotoPlaceholder() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1efe8",
      }}
      aria-hidden
    >
      <UtensilsCrossed
        size={40}
        strokeWidth={1.5}
        style={{ color: "#b4b2a9", opacity: 0.6 }}
      />
    </div>
  );
}
