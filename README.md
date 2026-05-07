# StudyPlan

**Planificador de estudio inteligente con repetición espaciada**

> Este proyecto fue desarrollado en su totalidad con Inteligencia Artificial (Claude Code / Claude Sonnet) como experimento para explorar hasta dónde puede llegar la IA en el desarrollo de software real. Desde la arquitectura hasta la lógica de negocio, pasando por el diseño de la interfaz, todo fue generado, iterado y refinado mediante prompts.

---

## Que es StudyPlan

StudyPlan es una aplicación web que genera automáticamente un plan de estudio personalizado a partir de tus evaluaciones pendientes. Ingresás tus materias o exámenes, los temas a estudiar, la dificultad de cada uno y cuántas horas tenés disponibles por día. El sistema se encarga del resto: distribuye los temas entre los días disponibles, aplica repetición espaciada para reforzar lo aprendido, y te muestra exactamente qué estudiar cada día.

Todo funciona de forma offline. No hay backend ni base de datos: los datos se guardan en el `localStorage` del navegador.

---

## Funcionalidades

### Gestion de evaluaciones
- Crear, editar y eliminar evaluaciones (parciales, finales, trabajos, etc.)
- Agregar temas con niveles de dificultad: Fácil, Media o Difícil
- Dividir temas en subtemas para un seguimiento más granular
- Configurar las horas de estudio disponibles por día para cada evaluación

### Plan diario ("Hoy")
- Vista de las sesiones de estudio generadas para el día actual
- Marcar sesiones como completadas
- Agregar horas extra si tenés más tiempo disponible
- Saltar el día actual (las horas se redistribuyen automáticamente)
- Barra de progreso por evaluación activa

### Calendario
- Vista completa del plan desde hoy hasta el último examen
- Desglose día a día de los temas a estudiar
- Marcar días específicos como "sin estudio" (feriados, días libres)
- Total de minutos estimados por día

### Estadísticas
- Progreso general en porcentaje
- Total de temas completados y pendientes
- Gráfico de torta (completado vs pendiente)
- Gráfico de barras por evaluación
- Tabla detallada con días restantes por materia

### Detalle de evaluación
- Lista completa de temas con checkboxes de completado
- Seguimiento individual de subtemas
- Editar o eliminar la evaluación desde el detalle

---

## Algoritmo de planificacion

El corazon de la app es la funcion `getPlan()` en `src/lib/api.js`. Funciona asi:

**Ponderacion por dificultad:**
| Dificultad | Peso | Duracion estimada |
|---|---|---|
| Facil | 1 | 30 minutos |
| Media | 2 | 60 minutos |
| Dificil | 3 | 90 minutos |

**Distribucion de temas:**
1. Calcula los dias disponibles hasta cada examen (excluyendo dias saltados)
2. Lista los temas pendientes ordenados por dificultad y proximidad del examen
3. Llena cada dia con tantos temas como permitan las horas configuradas
4. Guarda un "snapshot" del plan del dia actual para que no cambie durante el dia

**Repeticion espaciada:**
Los temas ya completados se reprograman para revision con intervalos que dependen de la dificultad y la proximidad del examen:
- Dificil: revision a los 2 dias base
- Media: revision a los 4 dias base
- Facil: revision a los 6 dias base

El intervalo se ajusta segun que tan cerca este el examen: cuanto mas cerca, mas frecuente la revision.

**Sistema de snapshot:**
El plan del dia de hoy se congela una vez generado y se guarda en `localStorage`. Esto evita que el plan cambie si agregás horas extra o modificás datos a mitad del dia. Las horas extra extienden el snapshot existente en vez de regenerarlo.

---

## Stack tecnologico

| Categoria | Tecnologia |
|---|---|
| Framework | React 19.2.5 con React Compiler |
| Router | React Router v7 |
| Bundler | Vite 8 con Oxc |
| Estilos | Tailwind CSS 3.4 |
| Componentes UI | Radix UI + shadcn/ui |
| Iconos | Lucide React |
| Graficos | Recharts |
| Notificaciones | Sonner |
| Persistencia | localStorage |

---

## Estructura del proyecto

```
study-plan/
├── src/
│   ├── components/
│   │   ├── DifficultyBadge.jsx        # Badge de nivel de dificultad
│   │   ├── EmptyState.jsx             # Estado vacio reutilizable
│   │   ├── NewEvaluationDialog.jsx    # Formulario crear/editar evaluacion
│   │   ├── ResetDataButton.jsx        # Boton para borrar todos los datos
│   │   └── ui/                        # Componentes shadcn/ui
│   ├── lib/
│   │   ├── api.js                     # Logica de negocio y persistencia
│   │   ├── dateUtils.js               # Utilidades de fechas en español
│   │   └── utils.js                   # Utilidades generales
│   ├── pages/
│   │   ├── Today.jsx                  # Vista "Hoy"
│   │   ├── Evaluations.jsx            # Lista de evaluaciones
│   │   ├── CalendarPage.jsx           # Vista calendario
│   │   ├── Stats.jsx                  # Estadisticas y graficos
│   │   └── EvaluationDetail.jsx       # Detalle de una evaluacion
│   ├── App.jsx                        # Shell principal y routing
│   └── main.jsx
├── public/
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Modelo de datos

```js
// Evaluacion
{
  id: string,
  name: string,
  exam_date: "YYYY-MM-DD",
  hours_per_day: number,
  topics: [
    {
      id: string,
      name: string,
      difficulty: "facil" | "media" | "dificil",
      completed: boolean,
      completed_at: string | null,
      subtopics: [
        { id: string, name: string, completed: boolean }
      ]
    }
  ]
}
```

Los datos se persisten en `localStorage` bajo las claves:
- `studyplan_data` — base de datos principal (evaluaciones + días saltados)
- `studyplan_snapshot` — plan congelado del día actual
- `extra_hours_YYYY-MM-DD` — horas extra por fecha

---

## Instalacion y uso

```bash
# Clonar el repositorio
git clone <repo-url>
cd study-plan

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para produccion
npm run build
```

La app corre en `http://localhost:5173` por defecto.

---

## Como usar la app

1. **Crear una evaluación**: ir a "Evaluaciones" → "Nueva evaluación". Completar nombre, fecha del examen, horas disponibles por día y agregar los temas con su dificultad.
2. **Ver el plan de hoy**: la pestaña "Hoy" muestra qué estudiar. Marcar las sesiones como completadas a medida que avanzás.
3. **Explorar el calendario**: "Calendario" muestra el plan completo día por día hasta el último examen.
4. **Revisar el progreso**: "Estadísticas" tiene gráficos y métricas de avance por materia.

---

## Contexto del proyecto

Este proyecto nació como un experimento: ¿puede la IA desarrollar una aplicación web completa y funcional sin intervención humana en el codigo?

La respuesta es sí. Toda la lógica de planificación, el diseño de componentes, la arquitectura de datos, el algoritmo de repetición espaciada y la interfaz de usuario fueron generados mediante prompts a Claude (Anthropic). El rol humano fue principalmente el de product owner: definir qué se quería construir, validar el resultado e iterar sobre los requerimientos.

El resultado es una app real, funcional y con una complejidad algorítmica no trivial, construida enteramente por IA.

---

## Licencia

MIT
