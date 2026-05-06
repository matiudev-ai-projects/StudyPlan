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
import { Plus, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { createEvaluation, updateEvaluation } from "../lib/api";
import { todayISO } from "../lib/dateUtils";

function newTopic() {
  return { id: "", name: "", difficulty: "media", subtopics: "" };
}

export default function NewEvaluationDialog({ open, onOpenChange, onSaved, existing }) {
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [topics, setTopics] = useState([newTopic()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existing) {
        setName(existing.name);
        setExamDate(existing.exam_date);
        setHoursPerDay(existing.hours_per_day);
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
        setName("");
        setExamDate("");
        setHoursPerDay(2);
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
    if (!examDate) return toast.error("La fecha del examen es obligatoria");
    if (examDate < todayISO()) return toast.error("La fecha del examen debe ser hoy o futura");

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
        exam_date: examDate,
        hours_per_day: Number(hoursPerDay),
        topics: cleanTopics,
      };
      if (existing) {
        await updateEvaluation(existing.id, payload);
        toast.success("Evaluación actualizada");
      } else {
        await createEvaluation(payload);
        toast.success("Evaluación creada");
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
            {existing ? "Editar evaluación" : "Nueva evaluación"}
          </DialogTitle>
          <DialogDescription>
            Define el examen, los temas y tus horas disponibles. Crearemos un plan con repetición espaciada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="Ej: Parcial de Cálculo"
                className="mt-1.5"
                required
              />
            </div>

            <div>
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

            <div>
              <Label htmlFor="hours" className="text-xs uppercase tracking-wider text-gray-500">
                Horas por día
              </Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                data-testid="eval-hours-input"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                className="mt-1.5"
                required
              />
            </div>
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
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {saving ? "Guardando..." : existing ? "Guardar cambios" : "Crear evaluación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}