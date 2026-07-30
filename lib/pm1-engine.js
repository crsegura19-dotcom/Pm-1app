// ============================================================================
// PM1 ENGINE — v2
// Multi-combate, compromiso con hora+obstáculo, bloqueo de evitación,
// decretos (positivos) vs lecciones (clarificadoras), hipótesis de abandono,
// registro de victorias e informe de evolución.
// ============================================================================

export const MECHANISMS = {
  procrastination: { label: "Procrastinación", weight: 0 },
  emotional_regulation: { label: "Regulación emocional", weight: 0 },
  avoidance: { label: "Evitación", weight: 0 },
  external_validation: { label: "Validación externa", weight: 0 },
  perfectionism: { label: "Perfeccionismo", weight: 0 },
  immediate_reward: { label: "Recompensa inmediata", weight: 0 },
  rejection_avoidance: { label: "Evitación del rechazo", weight: 0 },
  emotional_disconnection: { label: "Desconexión emocional", weight: 0 },
  automatic_routine: { label: "Rutina automática", weight: 0 },
  excessive_control: { label: "Control excesivo", weight: 0 },
  self_sabotage: { label: "Autosabotaje", weight: 0 },
  social_comparison: { label: "Comparación social", weight: 0 },
  catastrophizing: { label: "Catastrofización", weight: 0 },
  people_pleasing: { label: "Complacencia", weight: 0 },
  chronic_indecision: { label: "Indecisión crónica", weight: 0 },
  overcommitment: { label: "Sobrecompromiso", weight: 0 },
  self_isolation: { label: "Aislamiento", weight: 0 },
};

export const IDENTITIES = {
  pain_avoider: {
    label: "Evitador del dolor",
    description: "Evita situaciones que generan malestar antes de que ocurran.",
    triggers: ["avoidance", "emotional_regulation", "rejection_avoidance"],
  },
  validation_seeker: {
    label: "Buscador de validación",
    description: "Necesita aprobación externa para avanzar.",
    triggers: ["external_validation", "rejection_avoidance", "perfectionism"],
  },
  paralyzed_perfectionist: {
    label: "Perfeccionista paralizado",
    description: "Exige condiciones perfectas antes de actuar.",
    triggers: ["perfectionism", "procrastination", "avoidance"],
  },
  recurring_abandoner: {
    label: "Abandonador recurrente",
    description: "Inicia con energía y abandona antes de completar.",
    triggers: ["immediate_reward", "procrastination", "emotional_regulation"],
  },
  exhausted_survivor: {
    label: "Superviviente agotado",
    description: "Funciona en modo supervivencia, sin energía para cambiar.",
    triggers: ["emotional_disconnection", "automatic_routine", "emotional_regulation"],
  },
  anxious_controller: {
    label: "Controlador ansioso",
    description: "Necesita controlar cada variable para sentirse a salvo; la incertidumbre le resulta insoportable.",
    triggers: ["excessive_control", "catastrophizing", "chronic_indecision"],
  },
  chronic_pleaser: {
    label: "Complaciente crónico",
    description: "Antepone las necesidades ajenas para evitar el conflicto, incluso a costa de sí mismo.",
    triggers: ["people_pleasing", "external_validation", "self_isolation"],
  },
  self_saboteur: {
    label: "Autosaboteador",
    description: "Se acerca a lo que quiere y, justo antes de conseguirlo, encuentra una forma de arruinarlo.",
    triggers: ["self_sabotage", "immediate_reward", "procrastination"],
  },
  chronic_comparer: {
    label: "Comparador crónico",
    description: "Mide su valor constantemente contra el de los demás, nunca contra su propio punto de partida.",
    triggers: ["social_comparison", "external_validation", "perfectionism"],
  },
  overcommitted_overwhelmed: {
    label: "Sobrecomprometido desbordado",
    description: "Dice que sí a todo hasta que el cuerpo colapsa; decir que no le genera más miedo que el agotamiento mismo.",
    triggers: ["overcommitment", "chronic_indecision", "emotional_disconnection"],
  },
};

// Colores por defecto para hilos de combate, asignados por hash de título si el
// usuario no elige categoría. Mantiene la paleta oscura/lima de PM1 en vez de
// copiar la paleta de referencia.
export const THREAD_PALETTE = ["#c8f542", "#f59e0b", "#60a5fa", "#f87171", "#c084fc", "#4ade80"];

// ----------------------------------------------------------------------------
// CHECK-IN RÁPIDO — chips tipo LIBEN. No son datos clínicos, son una puerta de
// entrada ligera: tocar en vez de escribir. Se envían como contexto inicial
// del mensaje, no sustituyen el texto libre, solo reducen la fricción de abrir
// la boca por primera vez en un combate.
// ----------------------------------------------------------------------------
export const FEELING_CHIPS = [
  "Ansioso", "Cansado", "Motivado", "Culpable", "Aliviado", "Frustrado",
  "Bloqueado", "Avergonzado", "Con miedo", "Esperanzado", "Irritado", "En paz",
];

export const CONTEXT_CHIPS = [
  "Solo", "Con pareja", "Con familia", "En el trabajo", "En casa", "De noche",
];

export function formatCheckin(feelings, contexts, note) {
  const parts = [];
  if (feelings.length) parts.push(`Me siento: ${feelings.join(", ").toLowerCase()}.`);
  if (contexts.length) parts.push(`Contexto: ${contexts.join(", ").toLowerCase()}.`);
  if (note && note.trim()) parts.push(note.trim());
  return parts.join(" ");
}

// ----------------------------------------------------------------------------
// CHIPS DE ARRANQUE — puntos de entrada humanos, no categorías clínicas. Al
// tocar uno se inserta como inicio de frase en el texto libre; el usuario
// termina de escribir con sus propias palabras. No requieren que la persona
// ya sepa nombrar su patrón para poder empezar.
// ----------------------------------------------------------------------------
export const STARTER_CHIPS = [
  "Algo que evito",
  "Alguien a quien evito",
  "Una conversación pendiente",
  "Un hábito que no controlo",
  "Una decisión que postergo",
  "Algo que empecé y dejé a medias",
  "Un miedo que me paraliza",
  "Algo que sé que debería hacer",
];

// ----------------------------------------------------------------------------
// CHIPS DE ÁNIMO — segundo camino de entrada, para cuando no hay energía ni
// para escribir. Un toque basta: arranca la conversación con "Me siento X." y
// deja que la IA formule la siguiente pregunta según cómo llega la persona.
// ----------------------------------------------------------------------------
export const MOOD_CHIPS = [
  "Enfadado", "Decepcionado", "Amargado", "Ansioso", "Triste",
  "Agotado", "Frustrado", "Perdido", "Culpable", "Esperanzado",
];

export function colorForThread(thread) {
  let hash = 0;
  for (const ch of thread.title) hash = (hash * 31 + ch.charCodeAt(0)) % THREAD_PALETTE.length;
  return THREAD_PALETTE[hash];
}

// IDs únicos. Date.now() solo tiene resolución de milisegundo: dos elementos
// creados en el mismo tick (frecuente en updates síncronos) colisionarían y
// se pisarían el uno al otro. Por eso todo ID lleva un sufijo aleatorio.
export function uid(prefix = "") {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ----------------------------------------------------------------------------
// PRINCIPIOS PM1 — ya no se eligen de una librería fija. Los genera la IA al
// cierre de cada combate o cuando hay un aprendizaje genuino, siguiendo reglas
// estrictas (primera persona, presente, nacen del proceso vivido). Esta lista
// es solo una red de seguridad por si la IA no produce ninguno.
// ----------------------------------------------------------------------------
export const FALLBACK_PRINCIPLES = [
  "Yo actúo aunque no me sienta preparado.",
  "Yo avanzo un paso a la vez, incluso cuando dudo.",
  "Yo elijo la acción real por encima de la comodidad temporal.",
];


// ----------------------------------------------------------------------------
// CALENDARIO DE RACHAS — vista mensual con días ejecutados/evitados
// ----------------------------------------------------------------------------
export function buildStreakCalendar(profile, monthOffset = 0) {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const allMissions = Object.values(profile.threads).flatMap((t) => t.missions);
  const byDate = {};
  allMissions.forEach((m) => {
    if (m.executed === null || !m.resolvedAt) return;
    const d = new Date(m.resolvedAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const key = d.getDate();
    if (!byDate[key]) byDate[key] = { executed: 0, failed: 0 };
    if (m.executed) byDate[key].executed += 1;
    else byDate[key].failed += 1;
  });

  const todayKey = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      executed: byDate[d]?.executed || 0,
      failed: byDate[d]?.failed || 0,
      isToday: d === todayKey,
    });
  }

  // lunes = 0
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthLabel = base.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return { year, month, days, firstWeekday, monthLabel };
}

// Detalle de un día concreto del calendario — qué se hizo, en qué combate,
// ejecutado o evitado. Para el desplegable al pulsar un día.
export function getMissionsForDate(profile, year, month, day) {
  const result = [];
  for (const t of Object.values(profile.threads)) {
    for (const m of t.missions) {
      if (m.executed === null || !m.resolvedAt) continue;
      const d = new Date(m.resolvedAt);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        result.push({
          threadTitle: t.title,
          threadColor: colorForThread(t),
          action: m.action,
          executed: m.executed,
          obstacle: m.obstacle,
          time: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    }
  }
  return result.sort((a, b) => a.time.localeCompare(b.time));
}

// ----------------------------------------------------------------------------
// FRECUENCIA DE MECANISMOS — para el gráfico de barras del perfil
// ----------------------------------------------------------------------------
export function getMechanismFrequencyList(profile) {
  const entries = Object.entries(profile.mechanisms).filter(([, v]) => v.weight > 0);
  const max = entries.reduce((m, [, v]) => Math.max(m, v.weight), 0) || 1;
  return entries
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([key, v]) => ({ key, label: v.label, weight: v.weight, pct: Math.round((v.weight / max) * 100) }));
}

// ----------------------------------------------------------------------------
// ACTIVIDAD SEMANAL — últimos 7 días, ejecutado vs evitado
// ----------------------------------------------------------------------------
export function getWeeklyActivity(profile) {
  const days = [];
  const allMissions = Object.values(profile.threads).flatMap((t) => t.missions);
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayMissions = allMissions.filter((m) => {
      if (!m.resolvedAt) return false;
      const rd = new Date(m.resolvedAt);
      return rd >= d && rd < nextDay;
    });
    days.push({
      label: d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", ""),
      executed: dayMissions.filter((m) => m.executed).length,
      failed: dayMissions.filter((m) => m.executed === false).length,
    });
  }
  return days;
}

// ----------------------------------------------------------------------------
// PERFIL GLOBAL
// ----------------------------------------------------------------------------
export function buildProfile() {
  return {
    threads: {},              // id -> combatThread
    threadOrder: [],          // orden de creación / interacción
    activeThreadId: null,
    mechanisms: JSON.parse(JSON.stringify(MECHANISMS)), // agregado global
    dominantIdentity: null,
    resistanceLevel: 0,
    actionLevel: 0,
    movements: 0,
    streak: 0,
    lastSeen: null,
    wins: [],                 // registro personal global {id, date, text, threadId}
  };
}

export function createCombatThread(title, category) {
  const id = uid("thread_");
  const now = new Date().toISOString();
  const hasTitle = !!(title && title.trim());
  return {
    id,
    title: hasTitle ? title.trim() : "Sin nombre todavía",
    titleConfirmed: hasTitle,   // false = pendiente de que la IA lo sugiera tras leer el primer mensaje
    suggestedTitle: null,       // propuesta de la IA, en espera de confirmación del usuario
    category: category || null,
    status: "active",          // active | paused | completed
    createdAt: now,
    lastActivityAt: now,
    messages: [],
    missions: [],              // Primer Combate / Movimiento: {id, action, date, executed, obstacle, resolvedAt}
    mechanisms: JSON.parse(JSON.stringify(MECHANISMS)), // local a este hilo
    evasions: [],
    lessons: [],                // {id, text, date}
    principles: [],             // {id, text, date} — Principios PM1 generados por la IA
    environmentAdjustments: [], // {id, text, date, acknowledged} — cambios de entorno sugeridos
    substitutions: [],          // {id, text, date} — conductas sustitutas propuestas
    careMode: false,            // true = la IA detectó algo que excede el alcance de PM1; se apaga la gamificación
    openCount: 1,
    abandonCount: 0,            // veces que se dejó una misión sin ejecutar
    hypothesis: null,           // {text, createdAt, resolved: null|true|false}
    snapshots: [],              // [{date, dominantMechanism, resistance, executionRate, note}]
    progress: 0,                // heurística 0-100
  };
}

// El usuario acepta la sugerencia de la IA (o escribe la suya propia) para
// ponerle nombre al combate. A partir de aquí ya no se vuelve a sugerir.
export function confirmThreadTitle(profile, threadId, title) {
  const thread = profile.threads[threadId];
  if (!thread || !title || !title.trim()) return profile;
  const updated = { ...thread, title: title.trim(), titleConfirmed: true, suggestedTitle: null };
  return { ...profile, threads: { ...profile.threads, [threadId]: updated } };
}

export function dismissSuggestedTitle(profile, threadId) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const updated = { ...thread, suggestedTitle: null };
  return { ...profile, threads: { ...profile.threads, [threadId]: updated } };
}

// ----------------------------------------------------------------------------
// GESTIÓN DE HILOS
// ----------------------------------------------------------------------------
export function addThread(profile, title, category) {
  const thread = createCombatThread(title, category);
  return {
    ...profile,
    threads: { ...profile.threads, [thread.id]: thread },
    threadOrder: [...profile.threadOrder, thread.id],
    activeThreadId: thread.id,
  };
}

export function deleteThread(profile, threadId) {
  const threads = { ...profile.threads };
  delete threads[threadId];
  const threadOrder = profile.threadOrder.filter((id) => id !== threadId);
  const activeThreadId = profile.activeThreadId === threadId ? null : profile.activeThreadId;
  return { ...profile, threads, threadOrder, activeThreadId };
}

export function touchThread(profile, threadId) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const updated = { ...thread, lastActivityAt: new Date().toISOString(), openCount: thread.openCount + 1 };
  return { ...profile, threads: { ...profile.threads, [threadId]: updated } };
}

export function setThreadStatus(profile, threadId, status) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const updated = { ...thread, status };
  return { ...profile, threads: { ...profile.threads, [threadId]: updated } };
}

export function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

// Sugerencia BLANDA de retomar un hilo (nunca bloqueante). Regla de Eva:
// espaciar bien, y siempre ofrecer "dejarlo" como opción legítima.
export function shouldSuggestResume(thread) {
  if (thread.status !== "active") return false;
  return daysSince(thread.lastActivityAt) >= 4;
}

export function resumeSuggestionText(thread) {
  const d = Math.floor(daysSince(thread.lastActivityAt));
  return `Llevas ${d} días sin volver a "${thread.title}". ¿Tienes esto solucionado, quieres retomarlo, o prefieres dejarlo por ahora? Si prefieres dejarlo, también podemos explorar juntos por qué.`;
}

// ----------------------------------------------------------------------------
// MISIONES (Primer Combate / Movimiento) — sin fricción previa. El obstáculo
// se pregunta solo si el usuario dice que no lo hizo (retrospectivo).
// ----------------------------------------------------------------------------
export function addMission(profile, threadId, action) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const mission = {
    id: uid("m_"),
    action,
    date: new Date().toISOString(),
    obstacle: null,
    executed: null,
    resolvedAt: null,
  };
  const updated = { ...thread, missions: [...thread.missions, mission] };
  return { ...profile, threads: { ...profile.threads, [threadId]: updated } };
}

// Vencida si sigue sin resolver y es de un día anterior a hoy (no depende de
// una hora exacta — mucho menos fricción al crear la misión).
export function isMissionOverdue(mission) {
  if (!mission || mission.executed !== null) return false;
  const created = new Date(mission.date);
  const now = new Date();
  const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return createdDay.getTime() < today.getTime();
}


export function resolveMission(profile, threadId, missionId, executed, obstacle = null) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const missions = thread.missions.map((m) =>
    m.id === missionId
      ? { ...m, executed, obstacle: executed ? m.obstacle : obstacle, resolvedAt: new Date().toISOString() }
      : m
  );

  let updated = { ...thread, missions };
  let nextProfile = { ...profile };

  if (executed) {
    nextProfile.movements += 1;
    nextProfile.actionLevel = Math.min(10, nextProfile.actionLevel + 0.5);
    nextProfile.streak += 1;
    const mission = missions.find((m) => m.id === missionId);
    nextProfile.wins = [
      ...nextProfile.wins,
      { id: uid("w_"), date: new Date().toISOString(), threadId, text: winTextFor(thread, mission) },
    ];
    updated.progress = Math.min(100, updated.progress + 12);
  } else {
    nextProfile.streak = 0;
    nextProfile.resistanceLevel = Math.min(10, nextProfile.resistanceLevel + 0.5);
    updated.abandonCount = updated.abandonCount + 1;
  }

  updated = pushSnapshot(updated);
  nextProfile.threads = { ...nextProfile.threads, [threadId]: updated };
  return nextProfile;
}

function winTextFor(thread, mission) {
  const templates = [
    `Hoy actuaste en "${thread.title}" en vez de evitarlo.`,
    `Hoy no evitaste. Diste el movimiento que llevabas dejando para después en "${thread.title}".`,
    `Hoy demostraste que puedes actuar incluso sin sentirte preparado, en "${thread.title}".`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ----------------------------------------------------------------------------
// INTERPRETACIÓN DE LA INACCIÓN (nunca como fracaso — como información)
// ----------------------------------------------------------------------------
const INACTION_TEMPLATES = [
  (t) => `No has evitado el combate "${t.title}". Has evitado lo que podrías descubrir si lo terminaras.`,
  (t) => `Si vuelves, observa qué explicación te das para no haberlo hecho hoy. Esa explicación suele ser más interesante que la tarea misma.`,
  (t) => `Cuando algo importante se retrasa repetidamente, muchas veces el problema no es la tarea, sino lo que significa enfrentarla.`,
];

export function interpretInaction(thread) {
  if (thread.abandonCount === 0) return null;
  const idx = (thread.abandonCount - 1) % INACTION_TEMPLATES.length;
  return INACTION_TEMPLATES[idx](thread);
}

// ----------------------------------------------------------------------------
// HIPÓTESIS DE ABANDONO — a partir de 3 abandonos en el mismo hilo
// ----------------------------------------------------------------------------
function mostFrequent(arr) {
  if (!arr.length) return null;
  const counts = {};
  arr.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function maybeGenerateHypothesis(thread) {
  if (thread.hypothesis) return thread; // ya existe una activa
  if (thread.abandonCount < 3) return thread;
  const obstacles = thread.missions.filter((m) => m.executed === false && m.obstacle).map((m) => m.obstacle);
  const repeated = mostFrequent(obstacles);
  const excuseLine = repeated ? `no sea "${repeated}"` : "no sea la falta de tiempo";
  const text = `Has abierto "${thread.title}" varias veces y ${thread.abandonCount} de ellas lo has dejado antes de terminar. Es posible que el verdadero obstáculo ${excuseLine}, sino que una parte de ti prefiera mantener el problema antes que enfrentarte a lo que implica resolverlo. ¿Quieres comprobar si esta hipótesis es correcta?`;
  return { ...thread, hypothesis: { text, createdAt: new Date().toISOString(), resolved: null } };
}

export function resolveHypothesis(profile, threadId, confirmed) {
  const thread = profile.threads[threadId];
  if (!thread || !thread.hypothesis) return profile;
  const updated = { ...thread, hypothesis: { ...thread.hypothesis, resolved: confirmed } };
  return { ...profile, threads: { ...profile.threads, [threadId]: updated } };
}

// ----------------------------------------------------------------------------
// DECRETOS (positivos, 15 días, 2x/día) — separados de las lecciones
// ----------------------------------------------------------------------------
export function dominantMechanismOf(thread) {
  const entries = Object.entries(thread.mechanisms).filter(([, v]) => v.weight > 0);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1].weight - a[1].weight)[0][0];
}

// ----------------------------------------------------------------------------
// PRINCIPIOS PM1 — generados por la IA (ver reglas en buildSystemPrompt),
// nunca elegidos de una lista. Se acumulan por combate, sin duración ni
// repetición forzada: cada uno nace de un momento concreto de comprensión.
//
// Tope proporcional a la acción real: no tiene sentido "programar" una
// identidad nueva mucho más rápido de lo que la persona la está demostrando
// con hechos. Máximo 2 principios por movimiento ejecutado (mínimo 2 de
// margen inicial para no bloquear el primer cierre).
// ----------------------------------------------------------------------------
export function addPrinciples(profile, threadId, texts) {
  const thread = profile.threads[threadId];
  if (!thread || !texts || !texts.length) return profile;
  const executedCount = thread.missions.filter((m) => m.executed).length;
  const cap = Math.max(2, executedCount * 2);
  const existing = thread.principles || [];
  if (existing.length >= cap) return profile;
  const room = cap - existing.length;
  const now = new Date().toISOString();
  const newOnes = texts.filter(Boolean).slice(0, room).map((t) => ({ id: uid("pr_"), text: t, date: now }));
  return { ...profile, threads: { ...profile.threads, [threadId]: { ...thread, principles: [...existing, ...newOnes] } } };
}

// ----------------------------------------------------------------------------
// LECCIONES DE COMBATE (clarificadoras, generadas por la IA tras resolver misión)
// ----------------------------------------------------------------------------
export function addLesson(profile, threadId, text) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const lessons = [...thread.lessons, { id: uid("l_"), text, date: new Date().toISOString() }];
  return { ...profile, threads: { ...profile.threads, [threadId]: { ...thread, lessons } } };
}

// ----------------------------------------------------------------------------
// SNAPSHOTS + INFORME DE EVOLUCIÓN
// ----------------------------------------------------------------------------
function pushSnapshot(thread) {
  const resolved = thread.missions.filter((m) => m.executed !== null);
  const executed = resolved.filter((m) => m.executed).length;
  const executionRate = resolved.length ? Math.round((executed / resolved.length) * 100) : 0;
  const snapshot = {
    date: new Date().toISOString(),
    dominantMechanism: dominantMechanismOf(thread),
    evasionsCount: thread.evasions.length,
    executionRate,
  };
  return { ...thread, snapshots: [...thread.snapshots, snapshot] };
}

export function generateEvolutionReport(thread) {
  if (thread.snapshots.length < 3) {
    return { ready: false, text: "Todavía no hay suficiente historia en este combate para trazar tu evolución. Sigue actuando." };
  }
  const first = thread.snapshots[0];
  const last = thread.snapshots[thread.snapshots.length - 1];
  const spanDays = Math.max(1, Math.floor(daysSince(first.date)));

  const before = [];
  const after = [];

  if (first.dominantMechanism) before.push(`Tu mecanismo dominante era ${MECHANISMS[first.dominantMechanism]?.label.toLowerCase()}.`);
  if (last.dominantMechanism && last.dominantMechanism !== first.dominantMechanism) {
    after.push(`Tu mecanismo dominante ahora es ${MECHANISMS[last.dominantMechanism]?.label.toLowerCase()}.`);
  } else if (last.dominantMechanism) {
    after.push(`Sigues reconociendo ${MECHANISMS[last.dominantMechanism]?.label.toLowerCase()} cuando aparece, en vez de actuar a ciegas.`);
  }

  before.push(`Tu tasa de ejecución era del ${first.executionRate}%.`);
  after.push(`Tu tasa de ejecución ahora es del ${last.executionRate}%.`);

  const delta = last.executionRate - first.executionRate;
  let closing;
  if (delta > 15) {
    closing = "No solo has resuelto misiones. Has cambiado la forma en la que la persona que las empezó interpreta lo que le da miedo.";
  } else if (delta >= 0) {
    closing = "El cambio no siempre se ve en una línea recta hacia arriba. Sigues presente, y eso ya es una decisión.";
  } else {
    closing = "Los números bajaron. Eso no invalida lo recorrido — es información sobre en qué momento estás ahora, no sobre quién eres.";
  }

  return { ready: true, spanDays, before, after, closing };
}

// ----------------------------------------------------------------------------
// ESPEJO DE PATRÓN — determinista, sin IA, verdad sin suavizar
// ----------------------------------------------------------------------------
export function generatePatternMirror(profile) {
  const allMissions = Object.values(profile.threads).flatMap((t) => t.missions);
  const resolved = allMissions.filter((m) => m.executed !== null);
  const executed = resolved.filter((m) => m.executed).length;
  const failed = resolved.length - executed;
  const executionRate = resolved.length ? Math.round((executed / resolved.length) * 100) : null;

  if (resolved.length === 0) {
    return { ready: false, text: "Todavía no hay suficientes combates para mostrarte un patrón. El espejo se llena con acción, no con palabras." };
  }

  // La identidad ya viene filtrada por evidencia mínima (ver detectDominantIdentity).
  const identity = profile.dominantIdentity ? IDENTITIES[profile.dominantIdentity] : null;
  const topMechanism = Object.entries(profile.mechanisms)
    .filter(([, v]) => v.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)[0];

  const recentObstacles = allMissions
    .filter((m) => m.executed === false && m.obstacle)
    .slice(-5)
    .map((m) => m.obstacle);

  const lines = [];

  // Con muy poco dato, el espejo debe sonar como lo que es: un primer indicio,
  // no una sentencia. Un dato no es un patrón hasta que se repite.
  if (resolved.length < 3) {
    lines.push(`Todavía es pronto — solo ${resolved.length} ${resolved.length === 1 ? "combate resuelto" : "combates resueltos"}. Esto no es tu patrón todavía, es el primer trazo. Hace falta repetición real para que signifique algo.`);
    lines.push(`Lo que sí es un hecho: ${executed > 0 ? `ejecutaste ${executed} de ${resolved.length}` : `evitaste ${failed} de ${resolved.length}`}.`);
  } else {
    lines.push(`Te has comprometido ${resolved.length} veces. Ejecutaste ${executed}. Evitaste ${failed}.`);
    if (executionRate !== null) {
      if (executionRate >= 70) lines.push(`Tu tasa de ejecución es ${executionRate}%. Estás actuando más de lo que evitas. Eso es real.`);
      else if (executionRate >= 40) lines.push(`Tu tasa de ejecución es ${executionRate}%. Estás partido entre actuar y evitar. Ese es exactamente el punto donde se decide todo.`);
      else lines.push(`Tu tasa de ejecución es ${executionRate}%. La mayoría de las veces que te comprometiste, evitaste. Esto no es un juicio, es un dato.`);
    }
  }

  if (topMechanism) {
    const w = topMechanism[1].weight;
    if (w === 1) {
      lines.push(`La primera vez que apareció fue ${topMechanism[1].label.toLowerCase()}. Un dato no es una tendencia — si vuelve a aparecer, entonces hablamos de patrón.`);
    } else if (w < 4) {
      lines.push(`${topMechanism[1].label} ya ha aparecido ${w} veces. Empieza a asomar algo, pero todavía no lo llamaría "tu mecanismo".`);
    } else {
      lines.push(`Tu mecanismo dominante es ${topMechanism[1].label.toLowerCase()}. Aparece cada vez que algo te incomoda.`);
    }
  }

  if (identity) {
    lines.push(`El patrón que se está empezando a repetir se parece al de ${identity.label.toLowerCase()}: ${identity.description.toLowerCase()} Es una hipótesis basada en varias veces, no una etiqueta fija.`);
  }

  if (recentObstacles.length > 0) lines.push(`Las últimas excusas que usaste para no actuar: "${recentObstacles.join('", "')}". ¿Reconoces el patrón dentro del patrón?`);
  if (profile.streak === 0 && executed > 0) lines.push("Tu racha está en cero ahora mismo. Eso no borra lo que ya ejecutaste, pero sí significa que hoy es el día de empezar de nuevo.");

  return { ready: true, text: lines.join("\n\n") };
}

// Un solo dato no es un patrón. Antes exigía score > 0 (bastaba una sola
// detección para "declarar" una identidad); ahora exige al menos 3 puntos de
// evidencia acumulada — es decir, que el mecanismo haya aparecido varias
// veces, no una vez sola — antes de nombrar algo tan definitorio.
const IDENTITY_MIN_EVIDENCE = 3;

export function detectDominantIdentity(profile) {
  let best = null;
  let bestScore = 0;
  for (const [id, identity] of Object.entries(IDENTITIES)) {
    const score = identity.triggers.reduce((acc, t) => acc + (profile.mechanisms[t]?.weight || 0), 0);
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return bestScore >= IDENTITY_MIN_EVIDENCE ? best : null;
}

export function calculateResistance(profile) {
  const total = Object.values(profile.mechanisms).reduce((acc, m) => acc + m.weight, 0);
  return Math.min(10, Math.round(total / 3));
}

// ----------------------------------------------------------------------------
// FASES DEL COMBATE — se calculan de los datos reales, nunca las decide la IA
// a ojo. Dan contexto de en qué punto del proceso está la persona, para que
// el tono y la siguiente pregunta se adapten (no se le pide lo mismo a alguien
// que aún no ha actuado que a alguien que ya sostiene una racha).
// ----------------------------------------------------------------------------
export const PHASES = {
  reconocimiento: { label: "Reconocimiento", description: "Está nombrando el problema, todavía sin haber actuado." },
  resistencia: { label: "Resistencia", description: "Ha evitado al menos una vez sin haber ejecutado ninguna." },
  primer_movimiento: { label: "Primer movimiento", description: "Ya ejecutó una vez. El patrón empezó a romperse." },
  sostenimiento: { label: "Sostenimiento", description: "Repite la acción. Está construyendo consistencia." },
  integracion: { label: "Integración", description: "El patrón nuevo empieza a formar parte de su identidad." },
};

export function detectPhase(thread) {
  const executed = thread.missions.filter((m) => m.executed).length;
  const attempted = thread.missions.filter((m) => m.executed !== null).length;
  if (executed >= 5 || (thread.principles || []).length >= 2) return "integracion";
  if (executed >= 2) return "sostenimiento";
  if (executed === 1) return "primer_movimiento";
  if (attempted >= 1) return "resistencia";
  return "reconocimiento";
}

// ----------------------------------------------------------------------------
// AJUSTES DE ENTORNO — distintos de una misión: no son una acción puntual a
// verificar, son un cambio estructural (quitar acceso, cambiar rutina, cambiar
// compañía). Se reconocen con un simple "lo cambié", no con Sí/No de ejecución.
// ----------------------------------------------------------------------------
export function addEnvironmentAdjustment(profile, threadId, text) {
  const thread = profile.threads[threadId];
  if (!thread || !text) return profile;
  const adjustment = { id: uid("env_"), text, date: new Date().toISOString(), acknowledged: false };
  const environmentAdjustments = [...(thread.environmentAdjustments || []), adjustment];
  return { ...profile, threads: { ...profile.threads, [threadId]: { ...thread, environmentAdjustments } } };
}

export function acknowledgeEnvironmentAdjustment(profile, threadId, adjustmentId) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  const environmentAdjustments = (thread.environmentAdjustments || []).map((a) =>
    a.id === adjustmentId ? { ...a, acknowledged: true } : a
  );
  return { ...profile, threads: { ...profile.threads, [threadId]: { ...thread, environmentAdjustments } } };
}

// ----------------------------------------------------------------------------
// SUSTITUCIONES — la conducta que ocupa el lugar de lo que se evita, para no
// dejar un vacío. Se acumulan por combate igual que las lecciones.
// ----------------------------------------------------------------------------
export function addSubstitution(profile, threadId, text) {
  const thread = profile.threads[threadId];
  if (!thread || !text) return profile;
  const substitutions = [...(thread.substitutions || []), { id: uid("sub_"), text, date: new Date().toISOString() }];
  return { ...profile, threads: { ...profile.threads, [threadId]: { ...thread, substitutions } } };
}

// ----------------------------------------------------------------------------
// MODO CUIDADO — límite de alcance real. Cuando algo excede lo que PM1 puede
// abordar (crisis, riesgo real), se apaga toda la gamificación de ese combate
// hasta que la persona confirme que quiere seguir con normalidad. Esto se
// aplica también a nivel de aplicación, no solo de instrucción a la IA.
// ----------------------------------------------------------------------------
export function setCareMode(profile, threadId, value) {
  const thread = profile.threads[threadId];
  if (!thread) return profile;
  return { ...profile, threads: { ...profile.threads, [threadId]: { ...thread, careMode: value } } };
}

// ----------------------------------------------------------------------------
// SYSTEM PROMPT — ahora contextualizado por hilo (memoria específica del combate)
// ----------------------------------------------------------------------------
export function buildSystemPrompt(profile, thread) {
  const identity = profile.dominantIdentity ? IDENTITIES[profile.dominantIdentity] : null;
  const topMechanisms = Object.entries(profile.mechanisms)
    .filter(([, v]) => v.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3)
    .map(([, v]) => v.label)
    .join(", ");

  const phase = thread ? PHASES[detectPhase(thread)] : null;

  const threadContext = thread ? `
CONTEXTO DE ESTE COMBATE ESPECÍFICO ("${thread.title}"):
- Estado: ${thread.status}
- Fase actual: ${phase.label} — ${phase.description}
- Veces abierto: ${thread.openCount}
- Misiones propuestas en este combate: ${thread.missions.length}
- Misiones ejecutadas aquí: ${thread.missions.filter((m) => m.executed).length}
- Misiones evitadas aquí: ${thread.missions.filter((m) => m.executed === false).length}
- Evasiones detectadas en este combate: ${thread.evasions.slice(-5).join(", ") || "ninguna aún"}
- Lecciones ya descubiertas en este combate: ${thread.lessons.slice(-3).map((l) => l.text).join(" | ") || "ninguna aún"}
- Ajustes de entorno ya sugeridos: ${(thread.environmentAdjustments || []).map((a) => a.text).join(" | ") || "ninguno aún"}
${thread.hypothesis && thread.hypothesis.resolved === null ? `- HIPÓTESIS ACTIVA SIN RESOLVER: "${thread.hypothesis.text}"` : ""}
${thread.careMode ? `- MODO CUIDADO ACTIVO: en un mensaje anterior detectaste algo que excede el alcance de PM1. Sigue en tono de cuidado, sin gamificar, hasta que la propia persona indique que quiere retomar la normalidad.` : ""}
${!thread.titleConfirmed && !thread.suggestedTitle ? `- ESTE COMBATE AÚN NO TIENE NOMBRE. El usuario no tuvo que titularlo para poder empezar. En cuanto entiendas con claridad el patrón central de lo que cuenta (no hace falta esperar a la evasión ni al mecanismo, basta con entender el tema), incluye UNA vez: "TITULO_COMBATE: [nombre corto, 2-4 palabras, ej. 'Procrastinación con la tesis']". No lo hagas si todavía no tienes claridad — mejor esperar un mensaje más que titular mal.` : ""}
${thread.suggestedTitle && !thread.titleConfirmed ? `- YA PROPUSISTE UN NOMBRE ("${thread.suggestedTitle}") Y ESTÁ ESPERANDO RESPUESTA DEL USUARIO. NO propongas otro distinto. Espera a que lo confirme o lo cambie él.` : ""}
` : "";

  return `Eres PM1 — un sistema de intervención conductual. No eres un chatbot ni un terapeuta. Tu único objetivo es transformar evitación en acción real.

FILOSOFÍA CENTRAL:
Las personas no están bloqueadas por falta de información. Están bloqueadas por mecanismos de protección, evasión, miedo e identidad. El cambio ocurre cuando atraviesan aquello que evitan.

LÍMITES DE ALCANCE — ESTO TIENE PRIORIDAD ABSOLUTA SOBRE TODO LO DEMÁS:
PM1 es un sistema para procrastinación, evitación y patrones de autolimitación cotidianos. No es terapia, no es una línea de crisis, no sustituye ayuda profesional real.
Si en cualquier momento detectas señales de ideación suicida, autolesión, crisis aguda, abuso activo, adicción que requiere desintoxicación médica, o cualquier riesgo real e inmediato para la persona o para otros:
- Deja de lado por completo el marco de "combate" en esa respuesta. No propongas un Primer Combate. No hables de mecanismos, evasión, ni gamifiques nada.
- Responde con cuidado genuino, sin la urgencia habitual de "actúa ahora".
- Anima explícitamente y con claridad a buscar ayuda profesional o de emergencia real.
- Incluye una vez, al final: "MODO_CUIDADO: SI" — esto avisa al sistema para que no vuelva a gamificar este combate hasta que la persona confirme que quiere continuar con normalidad.
- No generes PRIMER COMBATE, PRINCIPIO_PM1, AJUSTE_ENTORNO ni SUSTITUCION en esa respuesta.

IMPORTANTE — MEMORIA POR COMBATE:
Cada combate (hilo) es independiente. Solo tienes memoria del combate actual, no de otros combates del usuario. No mezcles contextos de otros temas.
${threadContext}

TU ROL EN CADA CONVERSACIÓN:
1. Escucha activamente el problema declarado.
2. Detecta el problema real detrás del declarado.
3. Identifica el mecanismo psicológico activo.
4. Detecta la evasión concreta (¿qué está evitando realmente?).
5. Mide la resistencia al cambio.
6. Adapta tu tono y tu siguiente pregunta a la fase actual del combate (ver contexto arriba) — no le pidas lo mismo a alguien que todavía no ha actuado que a alguien que ya sostiene una racha.
7. Genera un Primer Combate: una acción concreta, pequeña, inmediata y verificable.
8. Cuando la acción que evita cumple una función real (alivio, distracción, recompensa) y dejarla sin más deja un vacío, propón además una conducta sustituta concreta que cumpla esa misma función de forma sana — no en cada combate, solo cuando aplique de verdad.
9. Si el patrón depende más del entorno que de la fuerza de voluntad (acceso fácil a la tentación, compañía, rutina que dispara el hábito), sugiere ocasionalmente un ajuste de entorno concreto, distinto de una acción puntual.
10. Busca confirmación de ejecución.
11. Si el usuario resuelve o cierra una misión con un descubrimiento genuino, ofrece UNA lección de combate: una frase que nazca literalmente de lo que él ha dicho, no una frase genérica de autoayuda.
12. Cuando haya un cierre real — al terminar un combate o cuando el usuario comprende algo importante sobre sí mismo — genera entre 1 y 3 Principios PM1 (ver reglas abajo).

PERFIL GLOBAL DEL USUARIO (agregado de todos sus combates):
- Mecanismos dominantes detectados: ${topMechanisms || "Sin datos aún"}
- Identidad observada: ${identity ? identity.label + " — " + identity.description : "Sin identificar aún"}
- Nivel de resistencia: ${profile.resistanceLevel}/10
- Nivel de acción: ${profile.actionLevel}/10
- Movimientos completados (todos los combates): ${profile.movements}
- Racha actual: ${profile.streak} días

PRINCIPIOS PM1 — qué son y cómo generarlos:
No son frases motivacionales ni afirmaciones vacías. Son nuevas normas de pensamiento que sustituyen una regla mental limitante que el propio usuario descubrió durante el combate. Reglas obligatorias:
- Nacen EXCLUSIVAMENTE de lo que el usuario vivió en esta conversación. Nunca uses una plantilla genérica sin conexión directa con lo que dijo.
- Primera persona. Siempre en tiempo presente — nunca futuro ("voy a..."), nunca negaciones ("ya no...", "dejo de...").
- Concretos, alcanzables, coherentes con el momento psicológico real del usuario. Nunca prometas resultados imposibles.
- Deben reforzar la identidad que el usuario está construyendo y recordar el aprendizaje más importante de este combate.
- Deben sonar naturales, como si el propio usuario los hubiera escrito después de comprender algo importante sobre sí mismo — no como una tarjeta de autoayuda.
- Fórmulas útiles como inspiración, adáptalas, no las repitas literalmente: "Yo elijo [acción] porque fortalece [valor]", "Yo decido...", "Yo actúo...", "Cada vez que...", "Cuando aparece..., yo...".
- Genéralos solo cuando de verdad haya un cierre o comprensión genuina — no en cada mensaje.
- Máximo 3 por respuesta, cada uno en su propia línea: "PRINCIPIO_PM1: [frase]"

PROTOCOLO DE CATASTROFIZACIÓN — solo cuando detectes con fuerza el mecanismo catastrophizing (el usuario está tratando un pensamiento como si fuera un hecho, saltando a la peor consecuencia posible como si fuera la más probable):
No lo suavices con una frase de consuelo genérica ("seguro que no es tan grave") ni saltes directo a proponer un Primer Combate. Antes, examina el pensamiento con el usuario, UNA pregunta por turno, en este orden — deja que él mismo llegue a la respuesta, tú no la des:
1. ¿Qué hechos verificables sostienen ese pensamiento? (no lo que imagina, lo que de verdad ha pasado u observado)
2. De lo que acaba de decir, ¿qué parte es interpretación suya y no un hecho?
3. ¿Qué emoción está construyendo esa interpretación ahora mismo? (miedo, cansancio, presión...)
4. Si pasara lo que de verdad es probable — no el peor escenario que imagina — ¿qué pasaría en realidad?
No preguntes las cuatro de golpe en un solo mensaje — es una conversación, un paso cada vez. Solo cuando el usuario haya respondido a las que hagan falta y él mismo vea qué parte de su pensamiento no tiene base real, cierra con el Primer Combate de siempre. El objetivo no es convencerle de pensar en positivo — es que examine el pensamiento en vez de obedecerlo automáticamente.

REGLAS ABSOLUTAS:
- No aconsejes de forma genérica. Cada respuesta debe estar anclada al contexto real del usuario y de ESTE combate específico.
- No des listas de pasos. Una sola dirección concreta.
- Cuando detectes evasión, nómbrala directamente pero sin agresividad.
- El Primer Combate debe ser tan pequeño que sea casi imposible no hacerlo.
- Si el usuario no ejecuta, investiga la resistencia sin castigar. No es un fracaso, es información.
- Máximo 3-4 párrafos por respuesta. Directo, sin relleno.
- Al generar un Primer Combate, termina con: "PRIMER COMBATE: [acción específica]"
- Al detectar un mecanismo claro, incluye al final: "MECANISMO: [nombre_en_ingles]" (uno de: procrastination, emotional_regulation, avoidance, external_validation, perfectionism, immediate_reward, rejection_avoidance, emotional_disconnection, automatic_routine, excessive_control, self_sabotage, social_comparison, catastrophizing, people_pleasing, chronic_indecision, overcommitment, self_isolation)
- Si detectas evasión clara, incluye: "EVASION: [descripción breve]"
- Si el usuario descubre algo genuino sobre su patrón (éxito o abandono con insight real), incluye como máximo una vez: "LECCION: [frase que nace literalmente de lo que él dijo]"
- Si el contexto indica que este combate aún no tiene nombre y ya tienes claridad sobre el patrón, incluye una vez: "TITULO_COMBATE: [nombre corto]" (ver instrucción arriba). Nunca lo hagas si el combate ya tiene nombre confirmado.
- Genera Principios PM1 solo en un cierre real, siguiendo las reglas de arriba al pie de la letra.
- Si propones un ajuste de entorno, incluye: "AJUSTE_ENTORNO: [cambio concreto]" (máximo uno por respuesta, no en cada mensaje).
- Si propones una conducta sustituta, incluye: "SUSTITUCION: [conducta concreta]" (máximo una por respuesta, solo cuando aplique).
- Si detectas señales de crisis real (ver LÍMITES DE ALCANCE arriba), incluye "MODO_CUIDADO: SI" y omite todos los demás tags de esa respuesta.
- Sobre terceras personas ausentes de la conversación (madre, padre, pareja, jefe, amigo, etc.): puedes hacer una afirmación directa sobre su motivación SOLO si es una síntesis literal de lo que el propio usuario ya ha descrito explícitamente, con sus palabras, en esta conversación — nunca una teoría nueva que tú añades por tu cuenta. Ejemplo: si el usuario lleva rato (o meses de conversación) contando que su madre revisa todo, necesita saber dónde está en cada momento y se altera cuando pierde el control, SÍ puedes decirle directamente "tu madre te controla así porque tiene miedo ella misma" — porque eso es literalmente lo que él ya te contó, no una interpretación tuya. Pero si el usuario no ha descrito nada de eso todavía, NO lo inventes ni lo sugieras con una pregunta que ya insinúe la respuesta ("¿crees que actúa así por miedo?"). En ese caso, pregunta primero sobre hechos observables ("¿qué hace ella cuando pasa eso?") y deja que sea el usuario quien construya la interpretación con lo que cuenta.
- Esto no es solo sobre el "por qué" de un tercero — también aplica a describir SU comportamiento o rol con una etiqueta cargada como si fuera un hecho objetivo (ej. "una voz externa que se mete en cada movimiento", "actúa como un perseguidor/controlador"). Aunque el usuario ya haya insinuado control o invasión, la IA no debe consolidarlo en una etiqueta propia. En su lugar, atribúyelo siempre a la percepción del usuario: "Lo que describes suena a que sientes que ella se mete en cada movimiento" o "Tú lo interpretas como control — ¿es así?", nunca "Hay una voz externa que se mete en cada movimiento" como afirmación directa.
- Lo mismo aplica cuando el mecanismo que detectas es del PROPIO usuario, no de un tercero. Si el usuario te da una explicación razonable y coherente de por qué hace algo (ej. "quiero prepararme para no explotar en reproches, no para controlar"), no la descartes ni la reinterpretes como "eso es el mecanismo hablando" sin más. Reconoce primero lo que tiene de válido esa explicación, y si de verdad ves un patrón debajo, pregúntaselo directamente en vez de dictarlo: "¿tiene sentido para ti lo que te digo, o sientes que me equivoco?". NUNCA cierres una exploración con una redirección ("vuelve más tarde", "eso ya lo hablamos otro día") mientras el usuario sigue pidiendo ayuda con algo y no ha mostrado, con sus propias palabras, que reconoce o está de acuerdo con tu lectura del mecanismo. Cerrar antes de esa confirmación deja el aprendizaje sin atravesar de verdad — no importa si tu diagnóstico es correcto, lo que importa es que la persona lo entienda y lo sienta suyo, no que tú tengas razón.
- Y cuando el usuario SÍ confirma que tu lectura tiene sentido, eso no es la señal para cerrar — es la señal para ir un nivel más abajo. Confirmar el nombre del mecanismo ("sí, es control") no es lo mismo que haberlo atravesado. Pregunta qué hay debajo: qué teme exactamente que pase si no lo controla, qué es "no ser suficiente" en ese miedo concreto, de dónde viene esa necesidad. Solo cuando esa capa más profunda también haya sido tocada — no solo nombrada — tiene sentido pasar a proponer un Primer Combate o cerrar la exploración.

Habla en español. Tono directo, sin condescendencia, sin motivación vacía. La verdad útil es más valiosa que el consuelo temporal.`;
}

export function parseAIResponse(text) {
  const mechanismMatch = text.match(/MECANISMO:\s*(\w+)/i);
  const evasionMatch = text.match(/EVASION:\s*(.+?)(?:\n|$)/i);
  const combatMatch = text.match(/PRIMER COMBATE:\s*(.+?)(?:\n|$)/i);
  const lessonMatch = text.match(/LECCION:\s*(.+?)(?:\n|$)/i);
  const titleMatch = text.match(/TITULO_COMBATE:\s*(.+?)(?:\n|$)/i);
  const principleMatches = [...text.matchAll(/PRINCIPIO_PM1:\s*(.+?)(?:\n|$)/gi)].map((m) => m[1].trim()).slice(0, 3);
  const environmentMatch = text.match(/AJUSTE_ENTORNO:\s*(.+?)(?:\n|$)/i);
  const substitutionMatch = text.match(/SUSTITUCION:\s*(.+?)(?:\n|$)/i);
  const careModeMatch = text.match(/MODO_CUIDADO:\s*(S[IÍ])/i);

  const clean = text
    .replace(/MECANISMO:\s*\w+/gi, "")
    .replace(/EVASION:\s*.+/gi, "")
    .replace(/PRIMER COMBATE:\s*.+/gi, "")
    .replace(/LECCION:\s*.+/gi, "")
    .replace(/TITULO_COMBATE:\s*.+/gi, "")
    .replace(/PRINCIPIO_PM1:\s*.+/gi, "")
    .replace(/AJUSTE_ENTORNO:\s*.+/gi, "")
    .replace(/SUSTITUCION:\s*.+/gi, "")
    .replace(/MODO_CUIDADO:\s*\w+/gi, "")
    .trim();

  return {
    text: clean,
    mechanism: mechanismMatch ? mechanismMatch[1].toLowerCase() : null,
    evasion: evasionMatch ? evasionMatch[1].trim() : null,
    combat: !careModeMatch && combatMatch ? combatMatch[1].trim() : null,
    lesson: lessonMatch ? lessonMatch[1].trim() : null,
    suggestedTitle: titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : null,
    principles: careModeMatch ? [] : principleMatches,
    environmentAdjustment: environmentMatch ? environmentMatch[1].trim() : null,
    substitution: substitutionMatch ? substitutionMatch[1].trim() : null,
    careMode: !!careModeMatch,
  };
}

// ----------------------------------------------------------------------------
// APLICAR RESULTADO DE IA A PERFIL + HILO
// ----------------------------------------------------------------------------
export function updateFromParsed(profile, threadId, parsed) {
  let nextProfile = { ...profile, mechanisms: { ...profile.mechanisms } };
  let thread = nextProfile.threads[threadId];
  if (!thread) return nextProfile;

  let mechanisms = { ...thread.mechanisms };
  let evasions = [...thread.evasions];
  let lessons = thread.lessons;
  let suggestedTitle = thread.suggestedTitle;

  if (parsed.mechanism && mechanisms[parsed.mechanism]) {
    mechanisms[parsed.mechanism] = { ...mechanisms[parsed.mechanism], weight: mechanisms[parsed.mechanism].weight + 1 };
    nextProfile.mechanisms[parsed.mechanism] = {
      ...nextProfile.mechanisms[parsed.mechanism],
      weight: nextProfile.mechanisms[parsed.mechanism].weight + 1,
    };
  }
  if (parsed.evasion && !evasions.includes(parsed.evasion)) evasions = [...evasions, parsed.evasion].slice(-10);
  if (parsed.lesson) lessons = [...lessons, { id: uid("l_"), text: parsed.lesson, date: new Date().toISOString() }];
  if (parsed.suggestedTitle && !thread.titleConfirmed && !thread.suggestedTitle) suggestedTitle = parsed.suggestedTitle;

  thread = { ...thread, mechanisms, evasions, lessons, suggestedTitle, lastActivityAt: new Date().toISOString() };
  nextProfile.threads = { ...nextProfile.threads, [threadId]: thread };

  if (parsed.principles && parsed.principles.length > 0) {
    nextProfile = addPrinciples(nextProfile, threadId, parsed.principles);
  }
  if (parsed.environmentAdjustment) {
    nextProfile = addEnvironmentAdjustment(nextProfile, threadId, parsed.environmentAdjustment);
  }
  if (parsed.substitution) {
    nextProfile = addSubstitution(nextProfile, threadId, parsed.substitution);
  }
  if (parsed.careMode) {
    nextProfile = setCareMode(nextProfile, threadId, true);
  }

  nextProfile.dominantIdentity = detectDominantIdentity(nextProfile);
  nextProfile.resistanceLevel = calculateResistance(nextProfile);
  nextProfile.lastSeen = new Date().toISOString();

  return nextProfile;
}
