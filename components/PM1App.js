"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  IDENTITIES,
  buildProfile,
  addThread,
  touchThread,
  setThreadStatus,
  colorForThread,
  shouldSuggestResume,
  resumeSuggestionText,
  addMission,
  isMissionOverdue,
  resolveMission,
  interpretInaction,
  maybeGenerateHypothesis,
  resolveHypothesis,
  generateEvolutionReport,
  generatePatternMirror,
  updateFromParsed,
  buildStreakCalendar,
  getMechanismFrequencyList,
  getWeeklyActivity,
  getMissionsForDate,
  FEELING_CHIPS,
  CONTEXT_CHIPS,
  formatCheckin,
  STARTER_CHIPS,
  MOOD_CHIPS,
  confirmThreadTitle,
  dismissSuggestedTitle,
  deleteThread,
  uid,
  PHASES,
  detectPhase,
  setCareMode,
} from "../lib/pm1-engine";

// ============================================================================
// Subcomponentes
// ============================================================================

function ResetButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{ marginTop: 4 }}>
      {!confirming ? (
        <button style={styles.resetBtn} onClick={() => setConfirming(true)}>Resetear todo</button>
      ) : (
        <div style={styles.resetConfirm}>
          <span style={styles.resetConfirmText}>¿Seguro? Se perderán todos los combates.</span>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={styles.resetConfirmYes} onClick={() => { setConfirming(false); onConfirm(); }}>Sí, resetear</button>
            <button style={styles.resetConfirmNo} onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status, stale }) {
  let color = "#4ade80";
  if (status === "paused") color = "#666";
  else if (status === "completed") color = "#60a5fa";
  else if (stale) color = "#f59e0b";
  return <span style={{ ...styles.statusDot, background: color }} />;
}

function BottomNav({ active, onChange }) {
  const items = [
    { id: "map", label: "Inicio", icon: "⌂" },
    { id: "mirror", label: "Espejo", icon: "◈" },
    { id: "decrees", label: "Mis Combates", icon: "⚔" },
    { id: "profile", label: "Perfil", icon: "●" },
  ];
  return (
    <div style={styles.bottomNav}>
      {items.map((it) => (
        <button
          key={it.id}
          style={styles.bottomNavBtn}
          onClick={() => onChange(it.id)}
        >
          <span style={{ ...styles.bottomNavIcon, color: active === it.id ? "#c8f542" : "#444" }}>{it.icon}</span>
          <span style={{ ...styles.bottomNavLabel, color: active === it.id ? "#c8f542" : "#555" }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function Bar({ pct, color = "#c8f542" }) {
  return (
    <div style={styles.barTrack}>
      <div style={{ ...styles.barFill, width: `${pct}%`, background: color }} />
    </div>
  );
}

// Captura ligera de obstáculo — solo aparece cuando el usuario dice "no pude".
// Un único campo, opcional, sin bloquear: se puede omitir con un toque.
function ObstacleCapture({ onConfirm, onSkip }) {
  const [text, setText] = useState("");
  return (
    <div style={styles.obstacleCapture}>
      <p style={styles.obstacleQuestion}>¿Qué te lo impidió?</p>
      <input
        style={styles.obstacleInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Una frase, lo primero que se te ocurra..."
        autoFocus
      />
      <div style={styles.combatBarBtns}>
        <button style={{ ...styles.combatBtn, ...styles.combatBtnNo }} onClick={() => onConfirm(text.trim())}>Confirmar</button>
        <button style={styles.obstacleSkipBtn} onClick={() => onSkip()}>Prefiero no decirlo</button>
      </div>
    </div>
  );
}

// Fila de chips con opción de añadir uno propio, tipo LIBEN ("+"). No sustituye
// el texto libre, solo evita escribir cuando la opción ya existe en la lista.
function ChipRow({ items, selected, onToggle, onAddCustom }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function submit() {
    const v = text.trim();
    if (v) onAddCustom(v);
    setText("");
    setAdding(false);
  }

  return (
    <div style={styles.chipRow}>
      {items.map((item) => (
        <button
          key={item}
          style={{ ...styles.chip, ...(selected.includes(item) ? styles.chipActive : {}) }}
          onClick={() => onToggle(item)}
        >
          {item}
        </button>
      ))}
      {!adding ? (
        <button style={styles.chipAddBtn} onClick={() => setAdding(true)}>+ Añadir</button>
      ) : (
        <div style={styles.chipAddRow}>
          <input
            style={styles.chipAddInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setAdding(false); setText(""); }
            }}
            placeholder="Escribe y pulsa Enter"
            autoFocus
          />
          <button style={styles.chipAddConfirm} onClick={submit}>✓</button>
        </div>
      )}
    </div>
  );
}

// Botón "+" independiente, para chips que insertan texto en vez de seleccionar
// (p.ej. los chips de arranque). Reutiliza el mismo patrón visual que ChipRow.
function AddChipInline({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");

  function submit() {
    const v = text.trim();
    if (v) onAdd(v);
    setText("");
    setAdding(false);
  }

  if (!adding) {
    return <button style={styles.chipAddBtn} onClick={() => setAdding(true)}>+ Añadir</button>;
  }
  return (
    <div style={styles.chipAddRow}>
      <input
        style={styles.chipAddInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setAdding(false); setText(""); }
        }}
        placeholder="Es otra cosa: descríbela..."
        autoFocus
      />
      <button style={styles.chipAddConfirm} onClick={submit}>✓</button>
    </div>
  );
}

// Dictado por voz usando la API nativa del navegador (gratis, sin servidor).
// Chrome/Android la soporta bien; si el navegador no la tiene, avisa y no rompe nada.
function MicButton({ onResult, style }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta dictado por voz. Prueba desde Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) onResult(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <button
      type="button"
      style={{ ...styles.micBtn, ...(listening ? styles.micBtnActive : {}), ...style }}
      onClick={toggleListening}
      title={listening ? "Escuchando... toca para parar" : "Dictar por voz"}
    >
      {listening ? "●" : "🎤"}
    </button>
  );
}

export default function PM1App() {
  const [view, setView] = useState("map");
  const [profile, setProfile] = useState(buildProfile);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openingText, setOpeningText] = useState("");
  const [customStarters, setCustomStarters] = useState([]);
  const [customMoods, setCustomMoods] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [titleNameInput, setTitleNameInput] = useState(null); // threadId cuando el usuario prefiere escribir su propio nombre
  const [confrontMission, setConfrontMission] = useState(null);
  const [dismissedResume, setDismissedResume] = useState({});
  const [evolutionOpenThreadId, setEvolutionOpenThreadId] = useState(null);
  const [openDecreeIds, setOpenDecreeIds] = useState([]);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [openDay, setOpenDay] = useState(null);
  const [obstacleCapture, setObstacleCapture] = useState(null); // { threadId, missionId, context: 'confront'|'bar' }
  const [postponedMissionIds, setPostponedMissionIds] = useState([]); // no volver a interrumpir con estas en esta sesión
  const [checkinFeelings, setCheckinFeelings] = useState([]);
  const [checkinContexts, setCheckinContexts] = useState([]);
  const [customFeelings, setCustomFeelings] = useState([]);
  const [customContexts, setCustomContexts] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pm1_profile_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        checkForOverdue(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [view, profile.activeThreadId, loading]);

  function persist(p) {
    setProfile(p);
    try { localStorage.setItem("pm1_profile_v3", JSON.stringify(p)); } catch {}
  }

  function checkForOverdue(p) {
    for (const tid of Object.keys(p.threads)) {
      const t = p.threads[tid];
      const pending = t.missions.find((m) => m.executed === null && !postponedMissionIds.includes(m.id));
      if (pending && isMissionOverdue(pending)) {
        setConfrontMission({ threadId: tid, mission: pending });
        return;
      }
    }
  }

  function handlePostpone(missionId) {
    setPostponedMissionIds((ids) => [...ids, missionId]);
    setConfrontMission(null);
  }

  const activeThread = profile.activeThreadId ? profile.threads[profile.activeThreadId] : null;

  // ============================================================================
  // MAPA DE COMBATES — arranque sin título manual
  // ============================================================================
  function handleStartCombat() {
    if (!openingText.trim()) return;
    const next = addThread(profile); // sin título: lo sugiere la IA tras leer esto
    const threadId = next.activeThreadId;
    const text = openingText.trim();
    persist(next);
    setOpeningText("");
    setCheckinFeelings([]);
    setCheckinContexts([]);
    setView("chat");
    sendMessageTo(threadId, next, text);
  }

  function insertStarter(phrase) {
    setOpeningText((t) => (t.trim() ? `${t.trim()} ` : `${phrase}: `));
  }

  // Segundo camino de entrada: selecciona uno o varios ánimos y confirma para
  // entrar. La IA recibe "Me siento X, Y." y formula la siguiente pregunta
  // según cómo llega la persona, en vez de pedirle que ya sepa nombrar el problema.
  function toggleMood(mood) {
    setSelectedMoods((m) => (m.includes(mood) ? m.filter((x) => x !== mood) : [...m, mood]));
  }

  function handleMoodStart() {
    if (!selectedMoods.length) return;
    const next = addThread(profile);
    const threadId = next.activeThreadId;
    const text = `Me siento ${selectedMoods.join(", ").toLowerCase()}.`;
    persist(next);
    setSelectedMoods([]);
    setView("chat");
    sendMessageTo(threadId, next, text);
  }

  function handleDeleteThread(threadId) {
    persist(deleteThread(profile, threadId));
    setConfirmDeleteId(null);
  }

  function openThread(threadId) {
    const next = touchThread(profile, threadId);
    persist({ ...next, activeThreadId: threadId });
    setCheckinFeelings([]);
    setCheckinContexts([]);
    setView("chat");
    const t = next.threads[threadId];
    const pending = t.missions.find((m) => m.executed === null);
    if (pending && isMissionOverdue(pending)) setConfrontMission({ threadId, mission: pending });
  }

  function toggleThreadStatus(threadId, current) {
    const nextStatus = current === "active" ? "paused" : "active";
    persist(setThreadStatus(profile, threadId, nextStatus));
  }

  function goToNav(id) {
    setCalendarOffset(0);
    setView(id);
  }

  // ============================================================================
  // CHECK-IN RÁPIDO (chips)
  // ============================================================================
  function toggleChip(list, setList, item) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  function addCustomFeeling(value) {
    setCustomFeelings((c) => (c.includes(value) ? c : [...c, value]));
    setCheckinFeelings((c) => (c.includes(value) ? c : [...c, value]));
  }

  function addCustomContext(value) {
    setCustomContexts((c) => (c.includes(value) ? c : [...c, value]));
    setCheckinContexts((c) => (c.includes(value) ? c : [...c, value]));
  }

  function useCheckinAsInput() {
    const text = formatCheckin(checkinFeelings, checkinContexts, input);
    setInput(text);
  }

  // ============================================================================
  // CHAT
  // ============================================================================
  async function sendMessageTo(threadId, profileSnapshot, text) {
    const thread = profileSnapshot.threads[threadId];
    if (!thread) return;
    const userMsg = { id: uid("msg_"), role: "user", content: text };
    const threadWithMsg = { ...thread, messages: [...thread.messages, userMsg] };
    let next = { ...profileSnapshot, threads: { ...profileSnapshot.threads, [threadId]: threadWithMsg } };
    persist(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: threadWithMsg.messages, profile: next, thread: threadWithMsg }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const { parsed } = data;

      const hasPendingMission = threadWithMsg.missions.some((m) => m.executed === null);

      const assistantMsg = {
        id: uid("msg_"),
        role: "assistant",
        content: parsed.text,
        mechanism: parsed.mechanism,
        evasion: parsed.evasion,
        lesson: parsed.lesson,
        principles: parsed.principles || [],
        environmentAdjustment: parsed.environmentAdjustment || null,
        substitution: parsed.substitution || null,
        careMode: !!parsed.careMode,
        proposedCombat: !hasPendingMission ? parsed.combat : null,
        committed: false,
        declined: false,
      };

      const threadWithReply = { ...threadWithMsg, messages: [...threadWithMsg.messages, assistantMsg] };
      next = { ...next, threads: { ...next.threads, [threadId]: threadWithReply } };
      next = updateFromParsed(next, threadId, parsed);

      // Si la IA ya volvió a proponer un combate normal, es su propia señal de
      // que el momento de cuidado pasó — no debería quedar el hilo bloqueado
      // en la interfaz esperando a que el usuario pulse un botón aparte.
      if (assistantMsg.proposedCombat && next.threads[threadId].careMode) {
        next = setCareMode(next, threadId, false);
      }

      persist(next);
    } catch (err) {
      const errMsg = { id: uid("msg_"), role: "assistant", content: "Error de conexión. Inténtalo de nuevo." };
      const threadWithErr = { ...threadWithMsg, messages: [...threadWithMsg.messages, errMsg] };
      persist({ ...next, threads: { ...next.threads, [threadId]: threadWithErr } });
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading || !activeThread) return;
    const text = input.trim();
    setInput("");
    setCheckinFeelings([]);
    setCheckinContexts([]);
    await sendMessageTo(activeThread.id, profile, text);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ============================================================================
  // COMPROMISO — la tarjeta pregunta directamente "¿Lo harás? Sí / No", sin
  // paso previo. "Sí" activa la misión ya. "No" también es una respuesta real:
  // se manda a la IA para que investigue la resistencia, no se descarta en silencio.
  // ============================================================================
  function handleCommit(actionText, messageId) {
    if (!activeThread) return;
    if (activeThread.missions.some((m) => m.executed === null)) return; // ya hay una pendiente
    let next = addMission(profile, activeThread.id, actionText);
    const thread = next.threads[activeThread.id];
    const messages = thread.messages.map((m) => (m.id === messageId ? { ...m, committed: true } : m));
    next = { ...next, threads: { ...next.threads, [activeThread.id]: { ...thread, messages } } };
    persist(next);
  }

  function handleDecline(messageId) {
    if (!activeThread) return;
    const messages = activeThread.messages.map((m) => (m.id === messageId ? { ...m, declined: true } : m));
    const next = { ...profile, threads: { ...profile.threads, [activeThread.id]: { ...activeThread, messages } } };
    persist(next);
    sendMessageTo(activeThread.id, next, "No, ahora no.");
  }

  // ============================================================================
  // RESOLUCIÓN DE MISIÓN
  // ============================================================================
  async function finalizeResolution(threadId, missionId, executed, obstacle = null) {
    let next = resolveMission(profile, threadId, missionId, executed, obstacle);
    let thread = next.threads[threadId];

    if (!executed) {
      const reflection = interpretInaction(thread);
      thread = maybeGenerateHypothesis(thread);
      const sysMsg = { role: "system-reflection", content: reflection };
      thread = { ...thread, messages: [...thread.messages, sysMsg] };
      next = { ...next, threads: { ...next.threads, [threadId]: thread } };
    }

    next = { ...next, activeThreadId: threadId };
    persist(next);
    setConfrontMission(null);
    setObstacleCapture(null);
    setView("chat");

    // El resultado se manda a la IA como si el usuario lo hubiera escrito —
    // tocar el botón ES la respuesta. Así el combate tiene un cierre real
    // (felicitación, lección, o indagación sin castigo) en vez de quedar mudo.
    const closingText = executed
      ? "Sí, lo hice."
      : obstacle
        ? `No pude. ${obstacle}`
        : "No pude.";

    await sendMessageTo(threadId, next, closingText);
  }

  function handleYes(threadId, missionId) {
    finalizeResolution(threadId, missionId, true, null);
  }

  function handleNo(threadId, missionId, context) {
    setObstacleCapture({ threadId, missionId, context });
  }

  function handleHypothesisAnswer(threadId, confirmed) {
    persist(resolveHypothesis(profile, threadId, confirmed));
  }

  // ============================================================================
  // PRINCIPIOS PM1
  // ============================================================================
  function togglePrinciplesOpen(id) {
    setOpenDecreeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  // ============================================================================
  // RESET
  // ============================================================================
  function resetAll() {
    persist(buildProfile());
    setConfrontMission(null);
    setObstacleCapture(null);
    setView("map");
  }

  const identity = profile.dominantIdentity ? IDENTITIES[profile.dominantIdentity] : null;
  const mirror = useMemo(() => generatePatternMirror(profile), [profile]);
  const threadList = profile.threadOrder.map((id) => profile.threads[id]).filter(Boolean).reverse();
  const pendingMissionInThread = activeThread
    ? activeThread.missions.find((m) => m.executed === null && !postponedMissionIds.includes(m.id))
    : null;
  const pendingMissionsCount = activeThread ? activeThread.missions.filter((m) => m.executed === null).length : 0;
  const calendar = useMemo(() => buildStreakCalendar(profile, calendarOffset), [profile, calendarOffset]);
  const mechanismFreq = useMemo(() => getMechanismFrequencyList(profile), [profile]);
  const weeklyActivity = useMemo(() => getWeeklyActivity(profile), [profile]);
  const recentThreads = useMemo(
    () => [...threadList].sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt)).slice(0, 3),
    [threadList]
  );

  // ==========================================================================
  // CONFRONTACIÓN (bloqueante, solo para misiones de días anteriores)
  // ==========================================================================
  if (confrontMission) {
    const { threadId, mission } = confrontMission;
    const thread = profile.threads[threadId];
    const capturing = obstacleCapture && obstacleCapture.missionId === mission.id;
    return (
      <div style={styles.root}>
        <div style={styles.confrontOverlay}>
          <span style={styles.confrontLabel}>PENDIENTE SIN RESOLVER</span>
          <h2 style={styles.confrontTitle}>"{thread?.title}"</h2>
          <p style={styles.confrontAction}>{mission.action}</p>
          {!capturing ? (
            <>
              <p style={styles.confrontQuestion}>¿Lo hiciste?</p>
              <div style={styles.confrontBtns}>
                <button style={{ ...styles.combatBtn, ...styles.combatBtnYes }} onClick={() => handleYes(threadId, mission.id)}>Sí, lo hice</button>
                <button style={{ ...styles.combatBtn, ...styles.combatBtnNo }} onClick={() => handleNo(threadId, mission.id, "confront")}>No pude</button>
              </div>
              <button style={styles.confrontPostponeBtn} onClick={() => handlePostpone(mission.id)}>Aún no — sigo con esto, dame más tiempo</button>
            </>
          ) : (
            <ObstacleCapture
              onConfirm={(text) => finalizeResolution(threadId, mission.id, false, text || null)}
              onSkip={() => finalizeResolution(threadId, mission.id, false, null)}
            />
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAPA
  // ==========================================================================
  if (view === "map") {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>PM1</span>
            <span style={styles.logoSub}>PRIMER MOVIMIENTO</span>
          </div>
        </div>

        <div style={styles.scrollArea}>
          <div style={styles.starterCard}>
            <p style={styles.starterQuestion}>¿Qué quieres hacer o enfrentar hoy?</p>
            <p style={styles.starterSub}>Y que llevas tiempo posponiendo, evitando, o sintiendo sin saber cómo soltarlo.</p>

            <div style={styles.chipRow}>
              {[...STARTER_CHIPS, ...customStarters].map((s) => (
                <button key={s} style={styles.chip} onClick={() => insertStarter(s)}>{s}</button>
              ))}
              <AddChipInline onAdd={(v) => { setCustomStarters((c) => [...c, v]); insertStarter(v); }} />
            </div>

            <div style={styles.textareaWithMic}>
              <textarea
                style={styles.starterTextarea}
                value={openingText}
                onChange={(e) => setOpeningText(e.target.value)}
                placeholder="O escribe con tus propias palabras, sin filtros..."
                rows={4}
              />
              <MicButton
                style={{ position: "absolute", bottom: 10, right: 10 }}
                onResult={(text) => setOpeningText((t) => (t.trim() ? `${t.trim()} ${text}` : text))}
              />
            </div>
            <button
              style={{ ...styles.newThreadBtn, ...styles.starterBtn, opacity: openingText.trim() ? 1 : 0.4 }}
              disabled={!openingText.trim()}
              onClick={handleStartCombat}
            >
              Continuar →
            </button>
          </div>

          <div style={styles.moodCard}>
            <p style={styles.moodQuestion}>¿O prefieres indicar cómo te sientes ahora mismo?</p>
            <p style={styles.starterSub}>Empezamos por ahí, y vamos descubriendo juntos qué es eso que llevas tiempo intentando.</p>
            <div style={styles.chipRow}>
              {[...MOOD_CHIPS, ...customMoods].map((m) => (
                <button
                  key={m}
                  style={{ ...styles.chip, ...(selectedMoods.includes(m) ? styles.chipActive : {}) }}
                  onClick={() => toggleMood(m)}
                >
                  {m}
                </button>
              ))}
              <AddChipInline onAdd={(v) => { setCustomMoods((c) => [...c, v]); toggleMood(v); }} />
            </div>
            {selectedMoods.length > 0 && (
              <button style={styles.checkinUseBtn} onClick={handleMoodStart}>Entrar con esto →</button>
            )}
          </div>

          {recentThreads.length > 0 && (
            <div style={styles.section}>
              <div style={styles.retomarHeader}>
                <span style={styles.sectionLabel}>RETOMAR</span>
                <button style={styles.retomarViewAll} onClick={() => goToNav("decrees")}>Ver todos →</button>
              </div>
              {recentThreads.map((t) => {
                const pending = t.missions.find((m) => m.executed === null);
                return (
                  <div key={t.id} style={styles.retomarRow} onClick={() => openThread(t.id)}>
                    <StatusDot status={t.status} stale={shouldSuggestResume(t)} />
                    <span style={styles.retomarTitle}>{t.title}</span>
                    {pending && <span style={styles.retomarPendingTag}>pendiente</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <BottomNav active="map" onChange={goToNav} />
      </div>
    );
  }

  // ==========================================================================
  // ESPEJO
  // ==========================================================================
  if (view === "mirror") {
    const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
    const maxWeekly = Math.max(1, ...weeklyActivity.map((d) => d.executed + d.failed));

    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>PM1</span>
            <span style={styles.logoSub}>ESPEJO</span>
          </div>
        </div>

        <div style={styles.scrollArea}>
          <div style={styles.mirrorCard}>
            <span style={styles.sectionLabel}>ESPEJO DE PATRÓN</span>
            <p style={styles.mirrorText}>{mirror.text}</p>
          </div>

          <div style={styles.section}>
            <div style={styles.calendarHeader}>
              <button style={styles.calendarNavBtn} onClick={() => { setCalendarOffset((o) => o - 1); setOpenDay(null); }}>‹</button>
              <span style={styles.calendarMonthLabel}>{calendar.monthLabel}</span>
              <button style={styles.calendarNavBtn} onClick={() => { setCalendarOffset((o) => Math.min(0, o + 1)); setOpenDay(null); }}>›</button>
            </div>
            <div style={styles.calendarWeekdays}>
              {weekdays.map((w) => <span key={w} style={styles.calendarWeekday}>{w}</span>)}
            </div>
            <div style={styles.calendarGrid}>
              {Array.from({ length: calendar.firstWeekday }).map((_, i) => <div key={"empty" + i} />)}
              {calendar.days.map((d) => {
                const hasActivity = d.executed > 0 || d.failed > 0;
                let bg = "transparent";
                let border = "1px solid #1a1a1a";
                let color = "#555";
                if (d.executed > 0) { bg = "rgba(74,222,128,0.15)"; border = "1px solid rgba(74,222,128,0.35)"; color = "#4ade80"; }
                else if (d.failed > 0) { bg = "rgba(248,113,113,0.1)"; border = "1px solid rgba(248,113,113,0.25)"; color = "#f87171"; }
                if (d.isToday) border = "1px solid #c8f542";
                if (openDay === d.day) border = "1px solid #e8e8e8";
                return (
                  <button
                    key={d.day}
                    style={{ ...styles.calendarDay, background: bg, border, color, cursor: hasActivity ? "pointer" : "default" }}
                    onClick={() => hasActivity && setOpenDay(openDay === d.day ? null : d.day)}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
            {openDay && (() => {
              const dayMissions = getMissionsForDate(profile, calendar.year, calendar.month, openDay);
              return (
                <div style={styles.dayDetail}>
                  <span style={styles.sectionLabel}>{openDay} DE {calendar.monthLabel.split(" de ")[0].toUpperCase()}</span>
                  {dayMissions.map((m, i) => (
                    <div key={i} style={styles.dayDetailRow}>
                      <span style={{ ...styles.dayDetailDot, background: m.executed ? "#4ade80" : "#f87171" }} />
                      <div style={styles.dayDetailBody}>
                        <span style={{ ...styles.dayDetailThread, color: m.threadColor }}>{m.threadTitle} · {m.time}</span>
                        <span style={styles.dayDetailAction}>{m.action}</span>
                        {!m.executed && m.obstacle && <span style={styles.dayDetailObstacle}>Motivo: {m.obstacle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={styles.calendarLegend}>
              <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#4ade80" }} /> ejecutado</span>
              <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#f87171" }} /> evitado</span>
            </div>
          </div>

          <div style={styles.section}>
            <span style={styles.sectionLabel}>ACTIVIDAD — ÚLTIMOS 7 DÍAS</span>
            <div style={styles.weeklyChart}>
              {weeklyActivity.map((d, i) => {
                const total = d.executed + d.failed;
                const execH = total ? (d.executed / maxWeekly) * 60 : 0;
                const failH = total ? (d.failed / maxWeekly) * 60 : 0;
                return (
                  <div key={i} style={styles.weeklyCol}>
                    <div style={styles.weeklyBarStack}>
                      {total === 0 ? (
                        <div style={styles.weeklyEmptyBar} />
                      ) : (
                        <>
                          {d.failed > 0 && <div style={{ ...styles.weeklyBarSeg, height: failH, background: "#f87171" }} />}
                          {d.executed > 0 && <div style={{ ...styles.weeklyBarSeg, height: execH, background: "#4ade80" }} />}
                        </>
                      )}
                    </div>
                    <span style={styles.weeklyLabel}>{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {mechanismFreq.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>MECANISMOS DETECTADOS</span>
              {mechanismFreq.map((m) => (
                <div key={m.key} style={styles.freqRow}>
                  <span style={styles.freqLabel}>{m.label}</span>
                  <Bar pct={m.pct} />
                  <span style={styles.freqCount}>{m.weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <BottomNav active="mirror" onChange={goToNav} />
      </div>
    );
  }

  // ==========================================================================
  // DECRETOS
  // ==========================================================================
  if (view === "decrees") {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>PM1</span>
            <span style={styles.logoSub}>MIS COMBATES</span>
          </div>
        </div>

        <div style={styles.scrollArea}>
          {threadList.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⚔</div>
              <p style={styles.emptyTitle}>Ningún combate abierto todavía</p>
              <p style={styles.emptyText}>Empieza uno desde Inicio.</p>
            </div>
          )}

          {threadList.map((t) => {
            const stale = shouldSuggestResume(t);
            const pendingCount = t.missions.filter((m) => m.executed === null).length;
            const executedCount = t.missions.filter((m) => m.executed).length;
            const deleting = confirmDeleteId === t.id;
            return (
              <div key={t.id} style={styles.threadCard}>
                <div style={styles.threadCardTop} onClick={() => !deleting && openThread(t.id)}>
                  <div style={styles.threadCardTitleRow}>
                    <StatusDot status={t.status} stale={stale} />
                    <span style={styles.threadCardTitle}>{t.title}</span>
                  </div>
                  <button
                    style={styles.threadPauseBtn}
                    onClick={(e) => { e.stopPropagation(); toggleThreadStatus(t.id, t.status); }}
                  >
                    {t.status === "paused" ? "reanudar" : "pausar"}
                  </button>
                </div>
                <p style={styles.threadCardMeta} onClick={() => !deleting && openThread(t.id)}>
                  {t.status === "paused"
                    ? "Pausado"
                    : pendingCount > 0
                      ? `${pendingCount} misión${pendingCount === 1 ? "" : "es"} sin resolver`
                      : `${executedCount} movimiento${executedCount === 1 ? "" : "s"} ejecutado${executedCount === 1 ? "" : "s"}`}
                  {stale ? " · lleva días sin tocarse" : ""}
                  {" · " + PHASES[detectPhase(t)].label}
                </p>
                <div style={styles.threadProgressTrack} onClick={() => !deleting && openThread(t.id)}>
                  <div style={{ ...styles.threadProgressFill, width: `${t.progress}%`, background: colorForThread(t) }} />
                </div>

                {(t.principles || []).length > 0 && (() => {
                  const open = openDecreeIds.includes(t.id);
                  return (
                    <div style={styles.decreeSubCard}>
                      <button style={styles.decreeCardHeader} onClick={() => togglePrinciplesOpen(t.id)}>
                        <span style={styles.decreeCardHeaderLeft}>
                          <span style={styles.decreeChevron}>{open ? "▾" : "▸"}</span>
                          <span style={styles.decreeSubLabel}>Principios PM1</span>
                        </span>
                        <span style={styles.decreeProgress}>{t.principles.length}</span>
                      </button>
                      {open && t.principles.slice().reverse().map((pr) => (
                        <p key={pr.id} style={styles.decreeCardText}>"{pr.text}"</p>
                      ))}
                    </div>
                  );
                })()}

                {!deleting ? (
                  <button style={styles.threadDeleteBtn} onClick={() => setConfirmDeleteId(t.id)}>Eliminar combate</button>
                ) : (
                  <div style={styles.resetConfirm}>
                    <span style={styles.resetConfirmText}>¿Seguro? Se perderá todo el progreso de "{t.title}".</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={styles.resetConfirmYes} onClick={() => handleDeleteThread(t.id)}>Sí, eliminar</button>
                      <button style={styles.resetConfirmNo} onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <BottomNav active="decrees" onChange={goToNav} />
      </div>
    );
  }

  // ==========================================================================
  // PERFIL
  // ==========================================================================
  if (view === "profile") {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>PM1</span>
            <span style={styles.logoSub}>PERFIL</span>
          </div>
        </div>

        <div style={styles.scrollArea}>
          <div style={styles.identityCard}>
            <span style={styles.identityLabel}>IDENTIDAD OBSERVADA</span>
            {identity ? (
              <>
                <h2 style={styles.identityName}>{identity.label}</h2>
                <p style={styles.identityDesc}>{identity.description}</p>
              </>
            ) : (
              <p style={styles.identityEmpty}>Aún sin datos suficientes para detectar un patrón.</p>
            )}
          </div>

          <div style={styles.statsRow}>
            {[
              { num: profile.movements, label: "Movimientos" },
              { num: profile.streak, label: "Racha" },
              { num: threadList.length, label: "Combates" },
              { num: profile.resistanceLevel, label: "Resistencia" },
            ].map(({ num, label }) => (
              <div key={label} style={styles.statCard}>
                <span style={styles.statNum}>{num}</span>
                <span style={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>

          {profile.wins.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>REGISTRO DE VICTORIAS</span>
              {profile.wins.slice(-8).reverse().map((w) => (
                <div key={w.id} style={styles.winItem}>
                  <span style={styles.winIcon}>✓</span>
                  <span style={styles.winText}>{w.text}</span>
                </div>
              ))}
            </div>
          )}

          {threadList.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>EVOLUCIÓN POR COMBATE</span>
              {threadList.map((t) => {
                const open = evolutionOpenThreadId === t.id;
                const report = open ? generateEvolutionReport(t) : null;
                return (
                  <div key={t.id} style={styles.evolutionRow}>
                    <button style={styles.evolutionToggle} onClick={() => setEvolutionOpenThreadId(open ? null : t.id)}>
                      {open ? "▾" : "▸"} {t.title}
                    </button>
                    {open && report && (
                      report.ready ? (
                        <div style={styles.evolutionCard}>
                          <p style={styles.evolutionSpan}>Últimos {report.spanDays} días</p>
                          <p style={styles.evolutionSubhead}>Antes</p>
                          {report.before.map((l, i) => <p key={i} style={styles.evolutionLine}>— {l}</p>)}
                          <p style={styles.evolutionSubhead}>Ahora</p>
                          {report.after.map((l, i) => <p key={i} style={styles.evolutionLine}>— {l}</p>)}
                          <p style={styles.evolutionClosing}>{report.closing}</p>
                        </div>
                      ) : (
                        <p style={styles.evolutionEmpty}>{report.text}</p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(threadList.length > 0 || profile.wins.length > 0) && <ResetButton onConfirm={resetAll} />}
        </div>
        <BottomNav active="profile" onChange={goToNav} />
      </div>
    );
  }

  // ==========================================================================
  // CHAT DE UN COMBATE
  // ==========================================================================
  if (!activeThread) {
    setView("map");
    return null;
  }

  const stale = shouldSuggestResume(activeThread);
  const showResumeBanner = stale && !dismissedResume[activeThread.id];
  const showCheckinChips = activeThread.messages.length === 0;
  const barCapturing = obstacleCapture && pendingMissionInThread && obstacleCapture.missionId === pendingMissionInThread.id;
  const currentPhase = PHASES[detectPhase(activeThread)];

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => setView("map")}>←</button>
          <div>
            <span style={{ ...styles.threadHeaderTitle, color: colorForThread(activeThread) }}>{activeThread.title}</span>
            {!activeThread.careMode && <div style={styles.phaseBadge}>{currentPhase.label}</div>}
          </div>
        </div>
      </div>

      {activeThread.careMode && (
        <div style={styles.careModeBanner}>
          <p style={styles.careModeText}>Este combate está en pausa mientras cuidamos de algo más importante. No hay prisa ni juego aquí.</p>
          <button style={styles.careModeBtn} onClick={() => persist(setCareMode(profile, activeThread.id, false))}>Quiero continuar con normalidad</button>
        </div>
      )}

      {activeThread.suggestedTitle && !activeThread.titleConfirmed && (
        <div style={styles.titleSuggestBanner}>
          <div style={styles.titleSuggestHeader}>
            <span style={styles.titleSuggestPulseDot} />
            <span style={styles.sectionLabel}>NOMBRE SUGERIDO PARA ESTE COMBATE</span>
          </div>
          {titleNameInput !== activeThread.id ? (
            <>
              <p style={styles.titleSuggestText}>"{activeThread.suggestedTitle}"</p>
              <div style={styles.resumeBannerBtns}>
                <button style={styles.resumeBtnSmall} onClick={() => persist(confirmThreadTitle(profile, activeThread.id, activeThread.suggestedTitle))}>Sí, así es</button>
                <button style={styles.resumeBtnSmall} onClick={() => setTitleNameInput(activeThread.id)}>Prefiero otro nombre</button>
                <button style={styles.resumeBtnSmall} onClick={() => persist(dismissSuggestedTitle(profile, activeThread.id))}>Ahora no</button>
              </div>
            </>
          ) : (
            <div style={styles.titleSuggestEditRow}>
              <input
                style={styles.chipAddInput}
                placeholder="Escribe el nombre que prefieras"
                defaultValue={activeThread.suggestedTitle}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") { persist(confirmThreadTitle(profile, activeThread.id, e.target.value)); setTitleNameInput(null); }
                }}
                id="title-rename-input"
              />
              <button
                style={styles.chipAddConfirm}
                onClick={() => {
                  const val = document.getElementById("title-rename-input").value;
                  persist(confirmThreadTitle(profile, activeThread.id, val));
                  setTitleNameInput(null);
                }}
              >✓</button>
            </div>
          )}
        </div>
      )}

      <div style={styles.chatContainer}>
        <div style={styles.messages}>

          {showResumeBanner && (
            <div style={styles.resumeBanner}>
              <p style={styles.resumeBannerText}>{resumeSuggestionText(activeThread)}</p>
              <div style={styles.resumeBannerBtns}>
                <button style={styles.resumeBtnSmall} onClick={() => setDismissedResume((d) => ({ ...d, [activeThread.id]: true }))}>Ya lo tengo resuelto</button>
                <button style={styles.resumeBtnSmall} onClick={() => setDismissedResume((d) => ({ ...d, [activeThread.id]: true }))}>Quiero retomarlo</button>
                <button style={styles.resumeBtnSmall} onClick={() => { toggleThreadStatus(activeThread.id, "active"); setDismissedResume((d) => ({ ...d, [activeThread.id]: true })); }}>Prefiero dejarlo por ahora</button>
              </div>
            </div>
          )}

          {activeThread.hypothesis && activeThread.hypothesis.resolved === null && (
            <div style={styles.hypothesisBanner}>
              <span style={styles.hypothesisLabel}>HIPÓTESIS</span>
              <p style={styles.hypothesisText}>{activeThread.hypothesis.text}</p>
              <div style={styles.resumeBannerBtns}>
                <button style={styles.resumeBtnSmall} onClick={() => handleHypothesisAnswer(activeThread.id, true)}>Creo que sí es eso</button>
                <button style={styles.resumeBtnSmall} onClick={() => handleHypothesisAnswer(activeThread.id, false)}>No creo que sea eso</button>
              </div>
            </div>
          )}

          {showCheckinChips && (
            <div style={styles.checkinCard}>
              <span style={styles.sectionLabel}>CHECK-IN RÁPIDO — TOCA, NO ESCRIBAS</span>
              <p style={styles.checkinQuestion}>¿Cómo te sientes ahora mismo?</p>
              <ChipRow
                items={[...FEELING_CHIPS, ...customFeelings]}
                selected={checkinFeelings}
                onToggle={(f) => toggleChip(checkinFeelings, setCheckinFeelings, f)}
                onAddCustom={addCustomFeeling}
              />
              <p style={styles.checkinQuestion}>¿Dónde/con quién estás?</p>
              <ChipRow
                items={[...CONTEXT_CHIPS, ...customContexts]}
                selected={checkinContexts}
                onToggle={(c) => toggleChip(checkinContexts, setCheckinContexts, c)}
                onAddCustom={addCustomContext}
              />
              {(checkinFeelings.length > 0 || checkinContexts.length > 0) && (
                <button style={styles.checkinUseBtn} onClick={useCheckinAsInput}>Usar esto para empezar →</button>
              )}
            </div>
          )}

          {activeThread.messages.length === 0 && !showCheckinChips && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⚔</div>
              <p style={styles.emptyTitle}>¿Qué quieres hacer o enfrentar hoy?</p>
            </div>
          )}

          {activeThread.messages.map((msg, i) => {
            if (msg.role === "system-reflection") {
              return (
                <div key={i} style={styles.reflectionRow}>
                  <span style={styles.reflectionText}>{msg.content}</span>
                </div>
              );
            }
            return (
              <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleAI) }}>
                  <p style={styles.bubbleText}>{msg.content}</p>
                  {msg.evasion && (
                    <div style={styles.evasionTag}>
                      <span style={styles.evasionTagLabel}>EVASIÓN DETECTADA</span>
                      <span style={styles.evasionTagText}>{msg.evasion}</span>
                    </div>
                  )}
                  {msg.lesson && (
                    <div style={styles.lessonTag}>
                      <span style={styles.lessonTagLabel}>LECCIÓN DE COMBATE</span>
                      <span style={styles.lessonTagText}>{msg.lesson}</span>
                    </div>
                  )}
                  {msg.principles && msg.principles.length > 0 && (
                    <div style={styles.principleTag}>
                      <span style={styles.principleTagLabel}>PRINCIPIO{msg.principles.length > 1 ? "S" : ""} PM1</span>
                      {msg.principles.map((pr, i) => (
                        <span key={i} style={styles.principleTagText}>"{pr}"</span>
                      ))}
                    </div>
                  )}
                  {msg.environmentAdjustment && (
                    <div style={styles.envTag}>
                      <span style={styles.envTagLabel}>AJUSTE DE ENTORNO</span>
                      <span style={styles.envTagText}>{msg.environmentAdjustment}</span>
                    </div>
                  )}
                  {msg.substitution && (
                    <div style={styles.subTag}>
                      <span style={styles.subTagLabel}>EN VEZ DE ESO</span>
                      <span style={styles.subTagText}>{msg.substitution}</span>
                    </div>
                  )}
                  {msg.proposedCombat && (
                    <div style={styles.combatTag}>
                      <span style={styles.combatTagLabel}>PRIMER COMBATE PROPUESTO</span>
                      <span style={styles.combatTagText}>{msg.proposedCombat}</span>
                      {msg.committed ? (
                        <span style={styles.combatCommittedTag}>✓ Ya te comprometiste con esto</span>
                      ) : msg.declined ? (
                        <span style={styles.combatDeclinedTag}>Dijiste que ahora no</span>
                      ) : (
                        <>
                          <p style={styles.combatAskQuestion}>¿Lo harás?</p>
                          <div style={styles.combatAskBtns}>
                            <button style={styles.commitBtn} onClick={() => handleCommit(msg.proposedCombat, msg.id)}>Sí, lo haré →</button>
                            <button style={styles.declineBtn} onClick={() => handleDecline(msg.id)}>No</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
              <div style={{ ...styles.bubble, ...styles.bubbleAI }}>
                <div style={styles.typingDots}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {pendingMissionInThread && !activeThread.careMode && (
          <div style={styles.combatBar}>
            <p style={styles.combatBarQuestion}>
              ¿Ya lo hiciste?
              {pendingMissionsCount > 1 && <span style={styles.combatBarQueueTag}> · {pendingMissionsCount} pendientes, empezando por la más antigua</span>}
            </p>
            <p style={styles.combatBarAction}>{pendingMissionInThread.action}</p>
            {!barCapturing ? (
              <>
                <div style={styles.combatBarBtns}>
                  <button style={{ ...styles.combatBtn, ...styles.combatBtnYes }} onClick={() => handleYes(activeThread.id, pendingMissionInThread.id)}>Sí, lo hice</button>
                  <button style={{ ...styles.combatBtn, ...styles.combatBtnNo }} onClick={() => handleNo(activeThread.id, pendingMissionInThread.id, "bar")}>No pude</button>
                </div>
                <button style={styles.confrontPostponeBtn} onClick={() => handlePostpone(pendingMissionInThread.id)}>Aún no — sigo con esto, dame más tiempo</button>
              </>
            ) : (
              <ObstacleCapture
                onConfirm={(text) => finalizeResolution(activeThread.id, pendingMissionInThread.id, false, text || null)}
                onSkip={() => finalizeResolution(activeThread.id, pendingMissionInThread.id, false, null)}
              />
            )}
          </div>
        )}

        <div style={styles.inputArea}>
          <textarea style={styles.textarea} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe tu situación..." rows={2} />
          <MicButton onResult={(text) => setInput((t) => (t.trim() ? `${t.trim()} ${text}` : text))} />
          <button style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }} onClick={sendMessage} disabled={loading || !input.trim()}>→</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================
const styles = {
  root: { fontFamily: "'Space Grotesk', sans-serif", background: "#0a0a0a", color: "#e8e8e8", height: "100vh", display: "flex", flexDirection: "column", maxWidth: 680, margin: "0 auto", border: "1px solid #1a1a1a", position: "relative" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  backBtn: { background: "none", border: "1px solid #222", color: "#888", width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 14 },
  logo: { fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 22, color: "#c8f542", letterSpacing: "-1px" },
  logoSub: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#333", letterSpacing: "3px", textTransform: "uppercase" },
  threadHeaderTitle: { fontSize: 16, fontWeight: 600 },
  phaseBadge: { fontSize: 10, color: "#666", fontFamily: "'Space Mono', monospace", letterSpacing: "0.5px", marginTop: 2 },

  careModeBanner: { margin: "10px 16px 0", padding: "14px 16px", background: "#0d0d0d", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 },
  careModeText: { fontSize: 13, color: "#a8c5e8", lineHeight: 1.6 },
  careModeBtn: { alignSelf: "flex-start", background: "none", border: "1px solid #60a5fa", color: "#93c5fd", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },

  scrollArea: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 90 },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", borderTop: "1px solid #1a1a1a", background: "#0a0a0a", flexShrink: 0 },
  bottomNavBtn: { flex: 1, background: "none", border: "none", padding: "10px 4px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" },
  bottomNavIcon: { fontSize: 18 },
  bottomNavLabel: { fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.5px" },

  starterCard: { padding: "20px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 },
  starterQuestion: { fontSize: 17, fontWeight: 600, color: "#e8e8e8", lineHeight: 1.4 },
  starterSub: { fontSize: 12.5, color: "#555", marginBottom: 4 },
  starterTextarea: { background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, color: "#e8e8e8", fontSize: 14, padding: "12px 14px", resize: "none", lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4, width: "100%" },
  textareaWithMic: { position: "relative" },
  micBtn: { background: "#141414", border: "1px solid #333", color: "#999", borderRadius: "50%", width: 34, height: 34, fontSize: 15, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  micBtnActive: { background: "rgba(248,113,113,0.15)", border: "1px solid #f87171", color: "#f87171", animation: "pulse 1.2s ease-in-out infinite" },
  starterBtn: { width: "100%", padding: "12px", fontSize: 13.5 },

  moodCard: { padding: "18px 20px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 },
  moodQuestion: { fontSize: 14.5, fontWeight: 600, color: "#ccc" },

  retomarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  retomarViewAll: { background: "none", border: "none", color: "#666", fontSize: 11.5, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  retomarRow: { display: "flex", alignItems: "center", gap: 9, padding: "8px 2px", cursor: "pointer" },
  retomarTitle: { fontSize: 13.5, color: "#ccc", flex: 1 },
  retomarPendingTag: { fontSize: 10, color: "#c8f542", fontFamily: "'Space Mono', monospace", letterSpacing: "0.5px" },

  titleSuggestBanner: { margin: "10px 16px 0", padding: "12px 14px", background: "#0d0d0d", border: "1px solid rgba(200,245,66,0.35)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, boxShadow: "0 4px 14px rgba(200,245,66,0.08)" },
  titleSuggestHeader: { display: "flex", alignItems: "center", gap: 7 },
  titleSuggestPulseDot: { width: 7, height: 7, borderRadius: "50%", background: "#c8f542", animation: "pulse 1.2s ease-in-out infinite", flexShrink: 0 },
  titleSuggestText: { fontSize: 15, color: "#c8f542", fontWeight: 600 },
  titleSuggestEditRow: { display: "flex", gap: 6, marginTop: 4 },
  newThreadBtn: { background: "#c8f542", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "0 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  threadCard: { padding: "16px 18px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 },
  threadCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  threadCardTitleRow: { display: "flex", alignItems: "center", gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  threadCardTitle: { fontSize: 15, fontWeight: 600, color: "#e8e8e8" },
  threadPauseBtn: { background: "none", border: "1px solid #222", color: "#555", fontSize: 10, padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "'Space Mono', monospace" },
  threadCardMeta: { fontSize: 12, color: "#555" },
  threadProgressTrack: { height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" },
  threadProgressFill: { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },

  emptyState: { textAlign: "center", padding: "40px 20px", margin: "auto", maxWidth: 360 },
  emptyIcon: { fontSize: 40, marginBottom: 16, filter: "grayscale(1)", opacity: 0.4 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "#888", marginBottom: 10 },
  emptyText: { fontSize: 13, color: "#444", lineHeight: 1.7 },

  chatContainer: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  messages: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 },
  msgRow: { display: "flex", width: "100%" },
  bubble: { maxWidth: "78%", padding: "12px 16px", borderRadius: 10, lineHeight: 1.6 },
  bubbleUser: { background: "#141414", border: "1px solid #222", borderBottomRightRadius: 2 },
  bubbleAI: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderBottomLeftRadius: 2 },
  bubbleText: { fontSize: 14, color: "#d4d4d4", whiteSpace: "pre-wrap", lineHeight: 1.7 },

  checkinCard: { padding: "18px 18px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 },
  checkinQuestion: { fontSize: 13, color: "#999", marginTop: 6 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { background: "#141414", border: "1px solid #262626", color: "#999", fontSize: 12.5, padding: "7px 13px", borderRadius: 20, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  chipActive: { background: "rgba(200,245,66,0.12)", border: "1px solid #c8f542", color: "#c8f542" },
  chipAddBtn: { background: "none", border: "1px dashed #333", color: "#666", fontSize: 12.5, padding: "7px 13px", borderRadius: 20, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  chipAddRow: { display: "flex", gap: 6, alignItems: "center" },
  chipAddInput: { background: "#0a0a0a", border: "1px solid #c8f542", borderRadius: 20, color: "#e8e8e8", fontSize: 12.5, padding: "7px 13px", fontFamily: "'Space Grotesk', sans-serif", minWidth: 140 },
  chipAddConfirm: { background: "#c8f542", color: "#0a0a0a", border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  checkinUseBtn: { marginTop: 10, background: "#c8f542", color: "#0a0a0a", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  combatTag: { marginTop: 12, padding: "10px 12px", background: "rgba(200,245,66,0.06)", border: "1px solid rgba(200,245,66,0.2)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 8 },
  combatTagLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#c8f542", letterSpacing: "2px" },
  combatTagText: { fontSize: 13, color: "#c8f542", fontWeight: 500 },
  combatCommittedTag: { alignSelf: "flex-start", fontSize: 11.5, color: "#4ade80", fontFamily: "'Space Mono', monospace" },
  combatDeclinedTag: { alignSelf: "flex-start", fontSize: 11.5, color: "#777", fontFamily: "'Space Mono', monospace" },
  combatAskQuestion: { fontSize: 12, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: "0.5px" },
  combatAskBtns: { display: "flex", gap: 8 },
  commitBtn: { flex: 1, background: "#c8f542", color: "#0a0a0a", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  declineBtn: { background: "none", border: "1px solid #333", color: "#888", borderRadius: 6, padding: "8px 16px", fontSize: 12.5, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },

  evasionTag: { marginTop: 8, padding: "8px 12px", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 6 },
  evasionTagLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#f87171", letterSpacing: "2px", marginBottom: 4 },
  evasionTagText: { fontSize: 12, color: "#f87171", opacity: 0.8 },

  lessonTag: { marginTop: 8, padding: "10px 12px", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 6 },
  lessonTagLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#60a5fa", letterSpacing: "2px", marginBottom: 4 },
  lessonTagText: { fontSize: 13, color: "#93c5fd", fontStyle: "italic" },

  principleTag: { marginTop: 8, padding: "10px 12px", background: "rgba(200,245,66,0.05)", border: "1px solid rgba(200,245,66,0.25)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 5 },
  principleTagLabel: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#c8f542", letterSpacing: "2px" },
  principleTagText: { fontSize: 13, color: "#e2f7a8", fontWeight: 500, lineHeight: 1.5 },

  envTag: { marginTop: 8, padding: "10px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 5 },
  envTagLabel: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#f59e0b", letterSpacing: "2px" },
  envTagText: { fontSize: 13, color: "#fbbf6a", lineHeight: 1.5 },

  subTag: { marginTop: 8, padding: "10px 12px", background: "rgba(192,132,252,0.06)", border: "1px solid rgba(192,132,252,0.25)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 5 },
  subTagLabel: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#c084fc", letterSpacing: "2px" },
  subTagText: { fontSize: 13, color: "#d8b4fe", lineHeight: 1.5 },

  reflectionRow: { display: "flex", justifyContent: "center", padding: "4px 20px" },
  reflectionText: { fontSize: 12, color: "#666", fontStyle: "italic", textAlign: "center", maxWidth: "85%", lineHeight: 1.6 },

  typingDots: { display: "flex", gap: 5, padding: "4px 2px", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#333", animation: "pulse 1.2s ease-in-out infinite" },

  resumeBanner: { margin: "0 0 4px", padding: "12px 14px", background: "#0d0d0d", border: "1px solid #2a2410", borderRadius: 8 },
  resumeBannerText: { fontSize: 12.5, color: "#c9b878", lineHeight: 1.6, marginBottom: 10 },
  resumeBannerBtns: { display: "flex", gap: 6, flexWrap: "wrap" },
  resumeBtnSmall: { background: "none", border: "1px solid #333", color: "#999", fontSize: 11, padding: "6px 10px", borderRadius: 5, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },

  hypothesisBanner: { margin: "0 0 4px", padding: "12px 14px", background: "#0d0d0d", border: "1px solid rgba(192,132,252,0.3)", borderRadius: 8 },
  hypothesisLabel: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#c084fc", letterSpacing: "2px" },
  hypothesisText: { fontSize: 12.5, color: "#d8b4fe", lineHeight: 1.6, margin: "6px 0 10px" },

  combatBar: { margin: "0 16px 12px", padding: "14px 16px", background: "#0d0d0d", border: "1px solid rgba(200,245,66,0.25)", borderRadius: 8, flexShrink: 0 },
  combatBarQuestion: { fontSize: 11, color: "#666", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 6 },
  combatBarQueueTag: { color: "#f59e0b", textTransform: "none", letterSpacing: "normal" },
  combatBarAction: { fontSize: 14, color: "#c8f542", fontWeight: 500, marginBottom: 12, lineHeight: 1.5 },
  combatBarBtns: { display: "flex", gap: 8 },
  combatBtn: { flex: 1, padding: "9px", border: "none", borderRadius: 5, fontSize: 13, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 },
  combatBtnYes: { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" },
  combatBtnNo: { background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" },

  obstacleCapture: { display: "flex", flexDirection: "column", gap: 8, marginTop: 6 },
  obstacleQuestion: { fontSize: 13, color: "#ccc" },
  obstacleInput: { background: "#0a0a0a", border: "1px solid #222", borderRadius: 6, color: "#e8e8e8", fontSize: 13, padding: "9px 12px", fontFamily: "'Space Grotesk', sans-serif" },
  obstacleSkipBtn: { flex: 1, background: "none", border: "1px solid #222", color: "#666", padding: "9px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  decreeSubCard: { marginTop: 4, paddingTop: 10, borderTop: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 8 },
  decreeSubLabel: { fontSize: 11.5, color: "#93c5fd" },
  threadDeleteBtn: { marginTop: 4, background: "none", border: "none", color: "#3a3a3a", fontSize: 11, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", alignSelf: "flex-start", padding: "4px 0" },
  decreeCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  decreeCardHeaderLeft: { display: "flex", alignItems: "center", gap: 8 },
  decreeChevron: { color: "#555", fontSize: 12, width: 12, display: "inline-block" },
  decreeProgress: { fontSize: 12, color: "#666", fontFamily: "'Space Mono', monospace" },
  decreeCardText: { fontSize: 13, color: "#93c5fd", fontStyle: "italic", lineHeight: 1.5 },

  inputArea: { display: "flex", alignItems: "flex-end", gap: 10, padding: "12px 16px 16px", borderTop: "1px solid #141414", flexShrink: 0 },
  textarea: { flex: 1, background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, color: "#e8e8e8", fontSize: 14, padding: "10px 14px", resize: "none", lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" },
  sendBtn: { background: "#c8f542", color: "#0a0a0a", border: "none", borderRadius: 8, width: 40, height: 40, fontSize: 20, cursor: "pointer", fontWeight: 700, flexShrink: 0 },

  confrontOverlay: { position: "absolute", inset: 0, background: "#0a0a0a", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 28px", gap: 6, zIndex: 10 },
  confrontLabel: { fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#f87171", letterSpacing: "3px" },
  confrontTitle: { fontSize: 18, color: "#888", margin: "8px 0 4px", fontWeight: 500 },
  confrontAction: { fontSize: 20, color: "#e8e8e8", fontWeight: 600, lineHeight: 1.4, margin: "6px 0 16px" },
  confrontQuestion: { fontSize: 16, color: "#c8f542", fontWeight: 600, marginBottom: 16 },
  confrontBtns: { display: "flex", gap: 10 },
  confrontPostponeBtn: { marginTop: 14, background: "none", border: "none", color: "#666", fontSize: 12.5, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", textAlign: "left", padding: 0 },

  identityCard: { padding: "20px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10 },
  identityLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#444", letterSpacing: "3px", marginBottom: 10 },
  identityName: { fontSize: 22, fontWeight: 700, color: "#c8f542", marginBottom: 8, letterSpacing: "-0.5px" },
  identityDesc: { fontSize: 13, color: "#666", lineHeight: 1.6 },
  identityEmpty: { fontSize: 13, color: "#333", lineHeight: 1.6 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: { padding: "14px 10px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, textAlign: "center", display: "flex", flexDirection: "column", gap: 4 },
  statNum: { fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: "#e8e8e8" },
  statLabel: { fontSize: 10, color: "#444", letterSpacing: "1px", textTransform: "uppercase" },

  mirrorCard: { padding: "20px", background: "#0d0d0d", border: "1px solid #2a2a1a", borderRadius: 10, display: "flex", flexDirection: "column", gap: 10 },
  mirrorText: { fontSize: 13.5, color: "#d4d4d4", lineHeight: 1.9, whiteSpace: "pre-line" },

  section: { padding: "18px 20px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12 },
  sectionLabel: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#444", letterSpacing: "3px" },

  winItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  winIcon: { color: "#4ade80", fontSize: 13, flexShrink: 0, marginTop: 1, fontFamily: "'Space Mono', monospace" },
  winText: { fontSize: 13, color: "#999", lineHeight: 1.5 },

  evolutionRow: { display: "flex", flexDirection: "column", gap: 8 },
  evolutionToggle: { background: "none", border: "none", color: "#999", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", padding: 0 },
  evolutionCard: { padding: "12px 14px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4 },
  evolutionSpan: { fontSize: 11, color: "#444", marginBottom: 6 },
  evolutionSubhead: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#666", letterSpacing: "2px", marginTop: 8 },
  evolutionLine: { fontSize: 12.5, color: "#999", lineHeight: 1.6 },
  evolutionClosing: { fontSize: 13, color: "#c8f542", marginTop: 10, lineHeight: 1.6, fontStyle: "italic" },
  evolutionEmpty: { fontSize: 12, color: "#444", paddingLeft: 4 },

  resetBtn: { background: "none", border: "1px solid #1e1e1e", color: "#333", padding: "10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace", letterSpacing: "1px", width: "100%" },
  resetConfirm: { padding: "14px 16px", background: "#0d0d0d", border: "1px solid #2a1a1a", borderRadius: 8 },
  resetConfirmText: { fontSize: 12, color: "#666" },
  resetConfirmYes: { flex: 1, padding: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  resetConfirmNo: { flex: 1, padding: "8px", background: "none", border: "1px solid #222", color: "#555", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },

  barTrack: { height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden", flex: 1 },
  barFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },

  calendarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  calendarNavBtn: { background: "none", border: "1px solid #222", color: "#888", width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontSize: 14 },
  calendarMonthLabel: { fontSize: 13, color: "#ccc", textTransform: "capitalize", fontWeight: 600 },
  calendarWeekdays: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calendarWeekday: { fontSize: 10, color: "#444", textAlign: "center", fontFamily: "'Space Mono', monospace" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calendarDay: { aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", padding: 0, margin: 0 },
  calendarLegend: { display: "flex", gap: 14, marginTop: 4 },

  dayDetail: { marginTop: 10, padding: "12px 14px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 },
  dayDetailRow: { display: "flex", gap: 9, alignItems: "flex-start" },
  dayDetailDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5 },
  dayDetailBody: { display: "flex", flexDirection: "column", gap: 3, flex: 1 },
  dayDetailThread: { fontSize: 11, fontFamily: "'Space Mono', monospace" },
  dayDetailAction: { fontSize: 13, color: "#ccc", lineHeight: 1.5 },
  dayDetailObstacle: { fontSize: 12, color: "#777", fontStyle: "italic" },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#666" },
  legendDot: { width: 7, height: 7, borderRadius: "50%" },

  weeklyChart: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 90, paddingTop: 10 },
  weeklyCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 },
  weeklyBarStack: { display: "flex", flexDirection: "column-reverse", height: 60, width: 16, justifyContent: "flex-start" },
  weeklyBarSeg: { width: "100%", borderRadius: 3, minHeight: 2 },
  weeklyEmptyBar: { width: "100%", height: 2, background: "#1a1a1a", borderRadius: 2, alignSelf: "flex-end" },
  weeklyLabel: { fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace", textTransform: "uppercase" },

  freqRow: { display: "flex", alignItems: "center", gap: 10 },
  freqLabel: { fontSize: 12, color: "#999", width: 130, flexShrink: 0 },
  freqCount: { fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace", width: 18, textAlign: "right" },
};
