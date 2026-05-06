import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { exportData, importData } from "../lib/api";
import { todayISO } from "../lib/dateUtils";

export default function ExportImportData() {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleExport = () => {
    try {
      const data = exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studyplan-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Datos exportados correctamente");
    } catch {
      toast.error("No se pudo exportar");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed?.studyplan_data?.evaluations) {
          toast.error("El archivo no tiene un formato válido");
          return;
        }
        setPending(parsed);
        setConfirmOpen(true);
      } catch {
        toast.error("No se pudo leer el archivo");
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    try {
      importData(pending);
      toast.success("Datos importados. Recargando...");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("No se pudo importar");
    } finally {
      setPending(null);
      setConfirmOpen(false);
    }
  };

  const evalCount = pending?.studyplan_data?.evaluations?.length ?? 0;
  const exportedAt = pending?.exported_at
    ? new Date(pending.exported_at).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        className="text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
      >
        <Download className="w-4 h-4 mr-1.5" />
        Exportar datos
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
      >
        <Upload className="w-4 h-4 mr-1.5" />
        Importar datos
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Importar estos datos?</AlertDialogTitle>
            <AlertDialogDescription>
              El archivo contiene {evalCount} {evalCount === 1 ? "evaluación" : "evaluaciones"} exportadas el {exportedAt}.
              Esto reemplazará todos tus datos actuales. La acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImport}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Sí, importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
