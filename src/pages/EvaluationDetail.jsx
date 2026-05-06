import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { getEvaluation, toggleTopic, toggleSubtopic, deleteEvaluation, getWarnings } from "../lib/api";
import { formatDate, daysBetween, todayISO } from "../lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DifficultyBadge from "../components/DifficultyBadge";
import NewEvaluationDialog from "../components/NewEvaluationDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EvaluationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ev, setEv] = useState(null);
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvaluation(id);
      if (!data) throw new Error("No encontrada");
      setEv(data);
      const w = getWarnings().find((x) => x.eval_id === id);
      setWarning(w || null);
    } catch {
      toast.error("Evaluación no encontrada");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (tid) => {
    try {
      const updated = await toggleTopic(id, tid);
      setEv(updated);
      toast.success("Estado actualizado. Plan recalculado.");
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const handleToggleSub = async (tid, sid) => {
    try {
      const updated = await toggleSubtopic(id, tid, sid);
      setEv(updated);
      toast.success("Subtema actualizado.");
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEvaluation(id);
      toast.success("Evaluación eliminada");
      navigate("/evaluaciones");
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  }

  if (!ev) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No se encontró la evaluación.</p>
        <Link
          to="/evaluaciones"
          className="text-emerald-600 hover:underline mt-3 inline-block text-sm"
        >
          Volver a evaluaciones
        </Link>
      </div>
    );
  }

  // Calcular progreso contando subtemas si existen
  let total = 0;
  let done = 0;
  ev.topics.forEach(t => {
    if (t.subtopics && t.subtopics.length > 0) {
      t.subtopics.forEach(s => {
        total++;
        if (s.completed) done++;
      });
    } else {
      total++;
      if (t.completed) done++;
    }
  });
  const percent = total ? Math.round((done / total) * 100) : 0;
  const isProject = ev.type === "project";
  const dleft = isProject
    ? (ev.weeks_goal || 4) * 7
    : daysBetween(todayISO(), ev.exam_date).length - 1;

  return (
    <div className="space-y-8 sp-fade-in">
      <Link
        to="/evaluaciones"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700"
        data-testid="back-to-evals"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <div className="sp-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-xs uppercase tracking-[0.12em] font-medium ${isProject ? "text-violet-600" : "text-emerald-600"}`}>
              {isProject ? "Proyecto libre" : "Evaluación"}
            </div>
            <h1 className="font-heading text-3xl font-medium text-gray-900 mt-1">
              {ev.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-gray-400" />
                {isProject ? `${ev.weeks_goal || 4} semanas de plan` : formatDate(ev.exam_date)}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isProject
                    ? percent === 100
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-violet-50 text-violet-700 border border-violet-100"
                    : dleft < 0
                    ? "bg-gray-100 text-gray-500"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                }`}
              >
                {isProject
                  ? percent === 100 ? "Completado" : "En curso"
                  : dleft < 0
                  ? "Finalizada"
                  : dleft === 0
                  ? "Hoy es el examen"
                  : `En ${dleft} ${dleft === 1 ? "día" : "días"}`}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              data-testid="edit-detail-btn"
            >
              <Pencil className="w-4 h-4 mr-1.5" /> Editar
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              data-testid="delete-detail-btn"
              className="text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar
            </Button>
          </div>
        </div>

        {warning && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <span className="font-medium">Horas insuficientes.</span>{" "}
              Con las horas actuales, faltarían ~{warning.shortfall_hours}h para cubrir todos los temas antes de la fecha límite.
              Aumentá las horas diarias desde la página de Hoy.
            </span>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progreso: {done} / {total} {total === 1 ? "ítem" : "ítems"}</span>
            <span className="font-medium text-gray-900">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl font-medium text-gray-900 mb-4">Temas</h2>
        <div className="sp-card divide-y divide-gray-100" data-testid="topics-list">
          {ev.topics.map((t) => (
            <div
              key={t.id}
              className="p-4 sm:p-5"
              data-testid={`topic-item-${t.id}`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox del tema padre — solo si NO tiene subtemas */}
                {(!t.subtopics || t.subtopics.length === 0) ? (
                  <button
                    onClick={() => handleToggle(t.id)}
                    data-testid={`toggle-topic-${t.id}`}
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      t.completed
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-gray-300 hover:border-emerald-400"
                    }`}
                  >
                    {t.completed && <CheckCircle2 className="w-5 h-5" />}
                  </button>
                ) : (
                  /* Si tiene subtemas, el círculo es solo indicador de progreso */
                  <div
                    className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      t.completed
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-gray-200"
                    }`}
                  >
                    {t.completed && <CheckCircle2 className="w-5 h-5" />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-medium ${
                        t.completed ? "line-through text-gray-400" : "text-gray-900"
                      }`}
                    >
                      {t.name}
                    </span>
                    <DifficultyBadge difficulty={t.difficulty} />
                  </div>

                  {/* Subtemas como checkboxes individuales */}
                  {t.subtopics && t.subtopics.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {t.subtopics.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleToggleSub(t.id, sub.id)}
                          data-testid={`toggle-subtopic-${sub.id}`}
                          className={`flex items-center gap-2 text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors ${
                            sub.completed
                              ? "text-gray-400 bg-gray-50"
                              : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-800"
                          }`}
                        >
                          {sub.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                          )}
                          <span className={sub.completed ? "line-through" : ""}>{sub.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <NewEvaluationDialog
        open={editing}
        onOpenChange={setEditing}
        onSaved={load}
        existing={ev}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los temas y el plan asociado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="confirm-delete-detail-btn"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}