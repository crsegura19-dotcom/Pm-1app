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
};

export function buildProfile() {
  return {
    mechanisms: JSON.parse(JSON.stringify(MECHANISMS)),
    evasions: [],
    dominantIdentity: null,
    resistanceLevel: 0,
    actionLevel: 0,
    awarenessLevel: 0,
    combats: [],
    movements: 0,
    streak: 0,
    lastSeen: null,
  };
}

export function detectDominantIdentity(profile) {
  let best = null;
  let bestScore = 0;
  for (const [id, identity] of Object.entries(IDENTITIES)) {
    const score = identity.triggers.reduce(
      (acc, t) => acc + (profile.mechanisms[t]?.weight || 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

export function calculateResistance(profile) {
  const total = Object.values(profile.mechanisms).reduce(
    (acc, m) => acc + m.weight,
    0
  );
  return Math.min(10, Math.round(total / 3));
}

export function buildSystemPrompt(profile) {
  const identity = profile.dominantIdentity ? IDENTITIES[profile.dominantIdentity] : null;
  const topMechanisms = Object.entries(profile.mechanisms)
    .filter(([, v]) => v.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3)
    .map(([, v]) => v.label)
    .join(", ");

  return `Eres PM1 — un sistema de intervención conductual. No eres un chatbot ni un terapeuta. Tu único objetivo es transformar evitación en acción real.

FILOSOFÍA CENTRAL:
Las personas no están bloqueadas por falta de información. Están bloqueadas por mecanismos de protección, evasión, miedo e identidad. El cambio ocurre cuando atraviesan aquello que evitan.

TU ROL EN CADA CONVERSACIÓN:
1. Escucha activamente el problema declarado.
2. Detecta el problema real detrás del declarado.
3. Identifica el mecanismo psicológico activo.
4. Detecta la evasión concreta (¿qué está evitando realmente?).
5. Mide la resistencia al cambio.
6. Genera un Primer Combate: una acción concreta, pequeña, inmediata y verificable.
7. Busca confirmación de ejecución.

PERFIL ACTUAL DEL USUARIO:
- Mecanismos dominantes detectados: ${topMechanisms || "Sin datos aún"}
- Identidad observada: ${identity ? identity.label + " — " + identity.description : "Sin identificar aún"}
- Nivel de resistencia: ${profile.resistanceLevel}/10
- Nivel de acción: ${profile.actionLevel}/10
- Combates realizados: ${profile.combats.length}
- Movimientos completados: ${profile.movements}
- Racha actual: ${profile.streak} días

REGLAS ABSOLUTAS:
- No aconsejes de forma genérica. Cada respuesta debe estar anclada al contexto real del usuario.
- No des listas de pasos. Una sola dirección concreta.
- Cuando detectes evasión, nómbrala directamente pero sin agresividad.
- El Primer Combate debe ser tan pequeño que sea casi imposible no hacerlo.
- Si el usuario no ejecuta, investiga la resistencia sin castigar.
- Máximo 3-4 párrafos por respuesta. Directo, sin relleno.
- Al generar un Primer Combate, termina con: "PRIMER COMBATE: [acción específica]"
- Al detectar un mecanismo claro, incluye al final: "MECANISMO: [nombre_en_ingles]" (uno de: procrastination, emotional_regulation, avoidance, external_validation, perfectionism, immediate_reward, rejection_avoidance, emotional_disconnection, automatic_routine)
- Si detectas evasión clara, incluye: "EVASION: [descripción breve]"

Habla en español. Tono directo, sin condescendencia, sin motivación vacía. La verdad útil es más valiosa que el consuelo temporal.`;
}

export function parseAIResponse(text) {
  const mechanismMatch = text.match(/MECANISMO:\s*(\w+)/i);
  const evasionMatch = text.match(/EVASION:\s*(.+?)(?:\n|$)/i);
  const combatMatch = text.match(/PRIMER COMBATE:\s*(.+?)(?:\n|$)/i);

  const clean = text
    .replace(/MECANISMO:\s*\w+/gi, "")
    .replace(/EVASION:\s*.+/gi, "")
    .replace(/PRIMER COMBATE:\s*.+/gi, "")
    .trim();

  return {
    text: clean,
    mechanism: mechanismMatch ? mechanismMatch[1].toLowerCase() : null,
    evasion: evasionMatch ? evasionMatch[1].trim() : null,
    combat: combatMatch ? combatMatch[1].trim() : null,
  };
}
