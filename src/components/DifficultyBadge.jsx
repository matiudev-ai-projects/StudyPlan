import { DIFFICULTY_LABEL } from "../lib/dateUtils";
import { Sparkles, Flame, Mountain } from "lucide-react";

export default function DifficultyBadge({ difficulty }) {
  const cls =
    difficulty === "facil"
      ? "sp-chip-facil"
      : difficulty === "dificil"
      ? "sp-chip-dificil"
      : "sp-chip-media";
  const Icon = difficulty === "facil" ? Sparkles : difficulty === "dificil" ? Mountain : Flame;
  return (
    <span className={cls} data-testid={`difficulty-${difficulty}`}>
      <Icon className="w-3 h-3" />
      {DIFFICULTY_LABEL[difficulty] || difficulty}
    </span>
  );
}
