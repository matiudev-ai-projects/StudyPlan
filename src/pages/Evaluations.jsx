import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, BookOpen, CalendarClock, Clock } from "lucide-react";
import { toast } from "sonner";
import { listEvaluations, deleteEvaluation } from "../lib/api";
import { formatDate, daysBetween, todayISO } from "../lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import NewEvaluationDialog from "../components/NewEvaluationDialog";
import EmptyState from "../components/EmptyState";

export default function Evaluations() {
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEvaluations();
      setEvals(data);
    } catch {
      toast.error("No se pudieron cargar las evaluaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEvaluation(deleteTarget.id);
      toast.success("Evaluación eliminada");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  return (
    <div className="space-y-8 sp-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-emerald-600 font-medium">
            Gestión
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-medium text-gray-900 mt-1">
            Evaluaciones
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Crea, edita y administra tus exámenes y temas.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          data-testid="new-eval-btn"
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nueva evaluación
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      ) : evals.length === 0 ? (
        <EmptyState
          testid="evals-empty"
          title="Aún no hay evaluaciones"
          description="Agrega tu primera evaluación: nombre, fecha del examen, temas con dificultad y horas por día. Nosotros armamos el plan."
          ctaLabel="Crear primera evaluación"
          ctaTo={null}
          imageUrl="https://static.prod-images.emergentagent.com/jobs/fb1c591f-dd71-4514-a699-36fc3bda4b43/images/2af176428b2489e472ee7c8211fab85766d335afcaa447f7a55dc863b3058a2c.png"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="evals-list">
          {evals.map((ev) => {
            const total = ev.topics.length;
            const done = ev.topics.filter((t) => t.completed).length;
            const percent = total ? Math.round((done / total) * 100) : 0;
            const dleft = daysBetween(todayISO(), ev.exam_date);
            return (
              <div
                key={ev.id}
                data-testid={`eval-item-${ev.id}`}
                className="sp-card p-5 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/evaluaciones/${ev.id}`}
                    className="min-w-0 flex-1 group"
                    data-testid={`eval-link-${ev.id}`}
                  >
                    <div className="flex items-center gap-2 text-emerald-600">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-medium">
                        {total} {total === 1 ? "tema" : "temas"}
                      </span>
                    </div>
                    <div className="font-heading text-xl font-medium text-gray-900 mt-1 group-hover:text-emerald-700 transition-colors">
                      {ev.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-gray-400" />
                        {formatDate(ev.exam_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {ev.hours_per_day} h/día
                      </span>
                      <span className={`text-xs font-medium ${dleft < 0 ? "text-gray-400" : "text-emerald-700"}`}>
                        {dleft < 0
                          ? "Finalizada"
                          : dleft === 0
                          ? "Hoy es el examen"
                          : `En ${dleft} ${dleft === 1 ? "día" : "días"}`}
                      </span>
                    </div>
                  </Link>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(ev);
                        setOpen(true);
                      }}
                      data-testid={`edit-eval-${ev.id}`}
                      className="text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(ev)}
                      data-testid={`delete-eval-${ev.id}`}
                      className="text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>
                      {done}/{total} temas completados
                    </span>
                    <span className="font-medium text-gray-700">{percent}%</span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewEvaluationDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={load}
        existing={editing}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="confirm-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los temas y el plan asociado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete-btn"
              className="bg-rose-600 hover:bg-rose-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
