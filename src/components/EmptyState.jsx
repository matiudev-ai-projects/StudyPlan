import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function EmptyState({
  title = "Aún no hay evaluaciones",
  description = "Comienza creando tu primera evaluación para generar un plan de estudio personalizado.",
  ctaLabel = "Nueva evaluación",
  ctaTo = "/evaluaciones",
  imageUrl,
  testid = "empty-state",
}) {
  return (
    <div
      data-testid={testid}
      className="sp-card p-10 sm:p-14 flex flex-col items-center text-center sp-fade-in"
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-40 h-40 object-contain opacity-90 mb-6"
        />
      )}
      <h3 className="font-heading text-xl sm:text-2xl font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md leading-relaxed">{description}</p>
      {ctaTo && (
        <Link
          to={ctaTo}
          data-testid={`${testid}-cta`}
          className="mt-6 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> {ctaLabel}
        </Link>
      )}
    </div>
  );
}
