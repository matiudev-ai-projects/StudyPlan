import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { clearSnapshot } from "../lib/api";

export default function ResetDataButton() {
  const [open, setOpen] = useState(false);

const handleReset = () => {
  localStorage.removeItem("studyplan_data");
  clearSnapshot(); // ← agregar esto
  toast.success("Datos eliminados. Recargando...");
  setTimeout(() => window.location.reload(), 800);
};

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        Borrar todos los datos
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las evaluaciones, temas y el plan de estudio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Sí, borrar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}