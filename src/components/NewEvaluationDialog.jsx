import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, BookOpen, GraduationCap, Layers } from "lucide-react";
import { toast } from "sonner";
import { createEvaluation, updateEvaluation } from "../lib/api";
import { todayISO } from "../lib/dateUtils";

function newTopic() {
  return { id: "", name: "", difficulty: "media", subtopics: "" };
}

export default function NewEvaluationDialog({ open, onOpenChange, onSaved, existing }) {
  const [type, setType] = useState("evaluation");
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [weeksGoal, setWeeksGoal] = useState(4);
  const [topics, setTopics] = useState([newTopic()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existing) {
        setType(existing.type || "evaluation");
        setName(existing.name);
        setExamDate(existing.exam_date || "");
        setWeeksGoal(existing.weeks_goal || 4);
        setTopics(
          (existing.topics || []).map((t) => ({
            id: t.id,
            name: t.name,
            difficulty: t.difficulty,
            // Subtemas: pueden ser objetos {id, name, completed} o strings legacy
            subtopics: (t.subtopics || [])
              .map((s) => (typeof s === "string" ? s : s.name))
              .join(", "),
            completed: t.completed,
            completed_at: t.completed_at,
            // Guardar los subtemas originales para preservar ids al editar
            _originalSubtopics: t.subtopics || [],
          }))
        );
      } else {
        setType("evaluation");
        setName("");
        setExamDate("");
        setWeeksGoal(4);
        setTopics([newTopic()]);
      }
    }
  }, [open, existing]);

  const updateTopic = (i, field, value) => {
    setTopics((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };
  const addTopic = () => setTopics((prev) => [...prev, newTopic()]);
  const removeTopic = (i) => setTopics((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("El nombre es obligatorio");
    if (type === "evaluation") {
      if (!examDate) return toast.error("La fecha del examen es obligatoria");
      if (examDate < todayISO()) return toast.error("La fecha del examen debe ser hoy o futura");
    }

    const cleanTopics = topics
      .filter((t) => t.name.trim())
      .map((t) => {
        // Parsear los nombres de subtemas desde el string
        const subNames = t.subtopics
          ? t.subtopics.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        // Intentar preservar objetos de subtemas existentes por nombre
        const originalSubs = t._originalSubtopics || [];
        const subtopics = subNames.map((subName) => {
          const existing = originalSubs.find(
            (s) => (typeof s === "object" ? s.name : s) === subName
          );
          if (existing && typeof existing === "object") {
            // Preservar id y completed del subtema existente
            return { id: existing.id, name: subName, completed: existing.completed };
          }
          // Subtema nuevo — el id lo asigna createEvaluation/updateEvaluation
          return subName;
        });

        return {
          id: t.id || undefined,
          name: t.name.trim(),
          difficulty: t.difficulty,
          subtopics,
          completed: !!t.completed,
          completed_at: t.completed_at || null,
        };
      });

    if (cleanTopics.length === 0) return toast.error("Agrega al menos un tema");

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        exam_date: type === "evaluation" ? examDate : null,
        weeks_goal: type === "project" ? Number(weeksGoal) : null,
        topics: cleanTopics,
      };
      if (existing) {
        await updateEvaluation(existing.id, payload);
        toast.success(type === "project" ? "Proyecto actualizado" : "Evaluación actualizada");
      } else {
        await createEvaluation(payload);
        toast.success(type === "project" ? "Proyecto creado" : "Evaluación creada");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="new-eval-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            {existing
              ? type === "project" ? "Editar proyecto" : "Editar evaluación"
              : type === "project" ? "Nuevo proyecto" : "Nueva evaluación"}
          </DialogTitle>
          <DialogDescription>
            {type === "project"
              ? "Define tu proyecto de aprendizaje libre con meta de semanas y repetición espaciada."
              : "Define el examen, los temas y tus horas disponibles. Crearemos un plan con repetición espaciada."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Toggle tipo */}
          <div className="flex rounded-lg border border-gray-200 p-1 gap-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setType("evaluation")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                type === "evaluation"
                  ? "bg-white shadow-sm text-emerald-700 border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Evaluación
            </button>
            <button
              type="button"
              onClick={() => setType("project")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                type === "project"
                  ? "bg-white shadow-sm text-violet-700 border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Layers className="w-4 h-4" />
              Proyecto libre
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="eval-name" className="text-xs uppercase tracking-wider text-gray-500">
                Nombre
              </Label>
              <Input
                id="eval-name"
                data-testid="eval-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "project" ? "Ej: Física General" : "Ej: Parcial de Cálculo"}
                className="mt-1.5"
                required
              />
            </div>

            {type === "evaluation" ? (
              <div className="sm:col-span-2">
                <Label htmlFor="exam-date" className="text-xs uppercase tracking-wider text-gray-500">
                  Fecha del examen
                </Label>
                <Input
                  id="exam-date"
                  type="date"
                  data-testid="eval-date-input"
                  value={examDate}
                  min={todayISO()}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <Label htmlFor="weeks-goal" className="text-xs uppercase tracking-wider text-gray-500">
                  Meta de semanas
                </Label>
                <Select
                  value={String(weeksGoal)}
                  onValueChange={(v) => setWeeksGoal(Number(v))}
                >
                  <SelectTrigger id="weeks-goal" data-testid="eval-weeks-input" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 10, 12, 16].map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w} semanas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-xs uppercase tracking-wider text-gray-500">Temas</Label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Los subtemas se separan por coma. Cada subtema será una sesión independiente.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addTopic}
                data-testid="add-topic-btn"
                className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              >
                <Plus className="w-4 h-4 mr-1" /> Añadir tema
              </Button>
            </div>

            <div className="space-y-3">
              {topics.map((t, i) => (
                <div
                  key={i}
                  data-testid={`topic-row-${i}`}
                  className="grid grid-cols-12 gap-2 items-start border border-gray-200 rounded-lg p-3 bg-gray-50/50"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Input
                      placeholder="Nombre del tema"
                      value={t.name}
                      data-testid={`topic-name-${i}`}
                      onChange={(e) => updateTopic(i, "name", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-4">
                    <Input
                      placeholder="Subtemas (separados por coma)"
                      value={t.subtopics}
                      data-testid={`topic-subtopics-${i}`}
                      onChange={(e) => updateTopic(i, "subtopics", e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Select
                      value={t.difficulty}
                      onValueChange={(v) => updateTopic(i, "difficulty", v)}
                    >
                      <SelectTrigger data-testid={`topic-difficulty-${i}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facil">Fácil</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="dificil">Difícil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTopic(i)}
                      disabled={topics.length === 1}
                      data-testid={`remove-topic-${i}`}
                      className="text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="cancel-eval-btn"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="save-eval-btn"
              className={type === "project" ? "bg-violet-500 hover:bg-violet-600" : "bg-emerald-500 hover:bg-emerald-600"}
            >
              {saving
                ? "Guardando..."
                : existing
                ? "Guardar cambios"
                : type === "project"
                ? "Crear proyecto"
                : "Crear evaluación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}