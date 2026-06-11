"use client";

import { useState, useRef, useEffect } from "react";
import {
  IDENTITIES,
  buildProfile,
  detectDominantIdentity,
  calculateResistance,
} from "../lib/pm1-engine";

function ResetButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{ marginTop: 4 }}>
      {!confirming ? (
        <button style={styles.resetBtn} onClick={() => setConfirming(true)}>
          Resetear perfil
        </button>
      ) : (
        <div style={styles.resetConfirm}>
          <span style={styles.resetConfirmText}>¿Seguro? Se perderán todos los datos.</span>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={styles.resetConfirmYes} onClick={() => { setConfirming(false); onConfirm(); }}>
              Sí, resetear
            </button>
            <button style={styles.resetConfirmNo} onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PM1App() {
  const [view, setView] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(buildProfile);
  const [activeCombat, setActiveCombat] = useState(null);
  const [combatPending, setCombatPending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pm1_profile");
      if (saved) setProfile(JSON.parse(saved));
      const savedMsgs = localStorage.getItem("pm1_messages");
      if (savedMsgs) setMessages(JSON.parse(savedMsgs));
      const savedCombat = localStorage.getItem("pm1_combat");
      if (savedCombat) setActiveCombat(JSON.parse(savedCombat));
    } catch {}
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function saveProfile(p) {
    setProfile(p);
    try { localStorage.setItem("pm1_profile", JSON.stringify(p)); } catch {}
  }

  function saveMessages(m) {
    setMessages(m);
    try { localStorage.setItem("pm1_messages", JSON.stringify(m)); } catch {}
  }

  function updateProfileFromParsed(parsed, p) {
    const updated = { ...p, mechanisms: { ...p.mechanisms } };
    if (parsed.mechanism && updated.mechanisms[parsed.mechanism]) {
      updated.mechanisms[parsed.mechanism] = {
        ...updated.mechanisms[parsed.mechanism],
        weight: updated.mechanisms[parsed.mechanism].weight + 1,
      };
    }
    if (parsed.evasion && !updated.evasions.includes(parsed.evasion)) {
      updated.evasions = [...updated.evasions, parsed.evasion].slice(-10);
    }
    updated.dominantIdentity = detectDominantIdentity(updated);
    updated.resistanceLevel = calculateResistance(updated);
    updated.lastSeen = new Date().toISOString();
    return updated;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    saveMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, profile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const { parsed } = data;
      const assistantMsg = {
        role: "assistant",
        content: parsed.text,
        combat: parsed.combat,
        mechanism: parsed.mechanism,
        evasion: parsed.evasion,
      };
      saveMessages([...newMessages, assistantMsg]);
      saveProfile(updateProfileFromParsed(parsed, profile));
      if (parsed.combat) {
        const combat = { id: Date.now(), action: parsed.combat, date: new Date().toISOString(), executed: null };
        setActiveCombat(combat);
        setCombatPending(true);
        try { localStorage.setItem("pm1_combat", JSON.stringify(combat)); } catch {}
      }
    } catch (err) {
      saveMessages([...newMessages, { role: "assistant", content: "Error de conexión. Inténtalo de nuevo." }]);
    }
    setLoading(false);
  }

  function handleCombatResult(executed) {
    if (!activeCombat) return;
    const updatedProfile = { ...profile };
    if (executed) {
      updatedProfile.movements += 1;
      updatedProfile.actionLevel = Math.min(10, updatedProfile.actionLevel + 0.5);
      updatedProfile.streak += 1;
      updatedProfile.combats = [...updatedProfile.combats, { ...activeCombat, executed: true }];
    } else {
      updatedProfile.streak = 0;
      updatedProfile.resistanceLevel = Math.min(10, updatedProfile.resistanceLevel + 0.5);
      updatedProfile.combats = [...updatedProfile.combats, { ...activeCombat, executed: false }];
    }
    saveProfile(updatedProfile);
    setCombatPending(false);
    setActiveCombat(null);
    try { localStorage.removeItem("pm1_combat"); } catch {}
    setInput(executed ? "Lo ejecuté." : "No pude ejecutarlo.");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetAll() {
    saveProfile(buildProfile());
    saveMessages([]);
    setActiveCombat(null);
    setCombatPending(false);
    try { localStorage.removeItem("pm1_combat"); } catch {}
  }

  const identity = profile.dominantIdentity ? IDENTITIES[profile.dominantIdentity] : null;
  const topMechanisms = Object.entries(profile.mechanisms)
    .filter(([, v]) => v.weight > 0)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>PM1</span>
          <span style={styles.logoSub}>PRIMER MOVIMIENTO</span>
        </div>
        <div style={styles.headerNav}>
          <button style={{ ...styles.navBtn, ...(view === "chat" ? styles.navBtnActive : {}) }} onClick={() => setView("chat")}>Combate</button>
          <button style={{ ...styles.navBtn, ...(view === "profile" ? styles.navBtnActive : {}) }} onClick={() => setView("profile")}>Perfil</button>
          <button style={styles.newSessionBtn} onClick={() => { saveMessages([]); setActiveCombat(null); setCombatPending(false); setInput(""); setView("chat"); try { localStorage.removeItem("pm1_combat"); } catch {} }} title="Nueva sesión">↺</button>
        </div>
      </div>

      {view === "chat" ? (
        <div style={styles.chatContainer}>
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>⚔</div>
                <p style={styles.emptyTitle}>¿Qué es eso que quieres y no puedes hacer?</p>
                <p style={styles.emptyText}>Escríbelo como se te venga. Sin filtros, sin justificaciones. Solo lo que está pasando.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ ...styles.bubble, ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleAI) }}>
                  <p style={styles.bubbleText}>{msg.content}</p>
                  {msg.combat && (
                    <div style={styles.combatTag}>
                      <span style={styles.combatTagLabel}>PRIMER COMBATE</span>
                      <span style={styles.combatTagText}>{msg.combat}</span>
                    </div>
                  )}
                  {msg.evasion && (
                    <div style={styles.evasionTag}>
                      <span style={styles.evasionTagLabel}>EVASIÓN DETECTADA</span>
                      <span style={styles.evasionTagText}>{msg.evasion}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
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

          {combatPending && activeCombat && (
            <div style={styles.combatBar}>
              <p style={styles.combatBarQuestion}>¿Ejecutaste el combate?</p>
              <p style={styles.combatBarAction}>{activeCombat.action}</p>
              <div style={styles.combatBarBtns}>
                <button style={{ ...styles.combatBtn, ...styles.combatBtnYes }} onClick={() => handleCombatResult(true)}>Sí, lo hice</button>
                <button style={{ ...styles.combatBtn, ...styles.combatBtnNo }} onClick={() => handleCombatResult(false)}>No pude</button>
              </div>
            </div>
          )}

          <div style={styles.inputArea}>
            <textarea style={styles.textarea} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe tu situación..." rows={2} />
            <button style={{ ...styles.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }} onClick={sendMessage} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      ) : (
        <div style={styles.profileContainer}>
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
              { num: profile.combats.length, label: "Combates" },
              { num: profile.resistanceLevel, label: "Resistencia" },
            ].map(({ num, label }) => (
              <div key={label} style={styles.statCard}>
                <span style={styles.statNum}>{num}</span>
                <span style={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>

          {topMechanisms.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>MECANISMOS DOMINANTES</span>
              {topMechanisms.map(([key, val]) => (
                <div key={key} style={styles.mechRow}>
                  <span style={styles.mechName}>{val.label}</span>
                  <div style={styles.mechBar}>
                    <div style={{ ...styles.mechFill, width: `${Math.min(100, val.weight * 15)}%` }} />
                  </div>
                  <span style={styles.mechCount}>{val.weight}x</span>
                </div>
              ))}
            </div>
          )}

          {profile.evasions.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>EVASIONES DETECTADAS</span>
              {profile.evasions.map((e, i) => (
                <div key={i} style={styles.evasionItem}>
                  <span style={styles.evasionBullet}>—</span>
                  <span style={styles.evasionItemText}>{e}</span>
                </div>
              ))}
            </div>
          )}

          {profile.combats.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionLabel}>HISTORIAL DE COMBATES</span>
              {profile.combats.slice(-5).reverse().map((c, i) => (
                <div key={i} style={styles.combatHistItem}>
                  <span style={{ ...styles.combatHistIcon, color: c.executed ? "#4ade80" : "#f87171" }}>
                    {c.executed ? "✓" : "✗"}
                  </span>
                  <span style={styles.combatHistText}>{c.action}</span>
                </div>
              ))}
            </div>
          )}

          {profile.combats.length === 0 && topMechanisms.length === 0 && !identity && (
            <div style={styles.profileEmpty}>
              <p style={styles.profileEmptyText}>Tu perfil se construye mientras interactúas. Empieza un combate.</p>
              <button style={styles.profileEmptyBtn} onClick={() => setView("chat")}>Ir al combate →</button>
            </div>
          )}

          {(profile.combats.length > 0 || topMechanisms.length > 0) && (
            <ResetButton onConfirm={resetAll} />
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { fontFamily: "'Space Grotesk', sans-serif", background: "#0a0a0a", color: "#e8e8e8", height: "100vh", display: "flex", flexDirection: "column", maxWidth: 680, margin: "0 auto", border: "1px solid #1a1a1a" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 10 },
  logo: { fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 22, color: "#c8f542", letterSpacing: "-1px" },
  logoSub: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#333", letterSpacing: "3px", textTransform: "uppercase" },
  headerNav: { display: "flex", gap: 4 },
  navBtn: { background: "none", border: "1px solid #222", color: "#555", padding: "6px 14px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.5px" },
  navBtnActive: { background: "#141414", border: "1px solid #333", color: "#c8f542" },
  newSessionBtn: { background: "none", border: "1px solid #222", color: "#444", padding: "6px 10px", borderRadius: 4, fontSize: 16, cursor: "pointer" },
  chatContainer: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  messages: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 },
  emptyState: { textAlign: "center", padding: "60px 20px", margin: "auto", maxWidth: 360 },
  emptyIcon: { fontSize: 40, marginBottom: 16, filter: "grayscale(1)", opacity: 0.4 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "#888", marginBottom: 10 },
  emptyText: { fontSize: 13, color: "#444", lineHeight: 1.7 },
  msgRow: { display: "flex", width: "100%" },
  bubble: { maxWidth: "78%", padding: "12px 16px", borderRadius: 10, lineHeight: 1.6 },
  bubbleUser: { background: "#141414", border: "1px solid #222", borderBottomRightRadius: 2 },
  bubbleAI: { background: "#0f0f0f", border: "1px solid #1e1e1e", borderBottomLeftRadius: 2 },
  bubbleText: { fontSize: 14, color: "#d4d4d4", whiteSpace: "pre-wrap", lineHeight: 1.7 },
  combatTag: { marginTop: 12, padding: "10px 12px", background: "rgba(200,245,66,0.06)", border: "1px solid rgba(200,245,66,0.2)", borderRadius: 6 },
  combatTagLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#c8f542", letterSpacing: "2px", marginBottom: 5 },
  combatTagText: { fontSize: 13, color: "#c8f542", fontWeight: 500 },
  evasionTag: { marginTop: 8, padding: "8px 12px", background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 6 },
  evasionTagLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#f87171", letterSpacing: "2px", marginBottom: 4 },
  evasionTagText: { fontSize: 12, color: "#f87171", opacity: 0.8 },
  typingDots: { display: "flex", gap: 5, padding: "4px 2px", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#333", animation: "pulse 1.2s ease-in-out infinite" },
  combatBar: { margin: "0 16px 12px", padding: "14px 16px", background: "#0d0d0d", border: "1px solid rgba(200,245,66,0.25)", borderRadius: 8, flexShrink: 0 },
  combatBarQuestion: { fontSize: 11, color: "#666", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 6 },
  combatBarAction: { fontSize: 14, color: "#c8f542", fontWeight: 500, marginBottom: 12, lineHeight: 1.5 },
  combatBarBtns: { display: "flex", gap: 8 },
  combatBtn: { flex: 1, padding: "9px", border: "none", borderRadius: 5, fontSize: 13, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 },
  combatBtnYes: { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" },
  combatBtnNo: { background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" },
  inputArea: { display: "flex", alignItems: "flex-end", gap: 10, padding: "12px 16px 16px", borderTop: "1px solid #141414", flexShrink: 0 },
  textarea: { flex: 1, background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, color: "#e8e8e8", fontSize: 14, padding: "10px 14px", resize: "none", lineHeight: 1.6, fontFamily: "'Space Grotesk', sans-serif" },
  sendBtn: { background: "#c8f542", color: "#0a0a0a", border: "none", borderRadius: 8, width: 40, height: 40, fontSize: 20, cursor: "pointer", fontWeight: 700, flexShrink: 0 },
  profileContainer: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 },
  identityCard: { padding: "20px", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10 },
  identityLabel: { display: "block", fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#444", letterSpacing: "3px", marginBottom: 10 },
  identityName: { fontSize: 22, fontWeight: 700, color: "#c8f542", marginBottom: 8, letterSpacing: "-0.5px" },
  identityDesc: { fontSize: 13, color: "#666", lineHeight: 1.6 },
  identityEmpty: { fontSize: 13, color: "#333", lineHeight: 1.6 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: { padding: "14px 10px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, textAlign: "center", display: "flex", flexDirection: "column", gap: 4 },
  statNum: { fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, color: "#e8e8e8" },
  statLabel: { fontSize: 10, color: "#444", letterSpacing: "1px", textTransform: "uppercase" },
  section: { padding: "18px 20px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12 },
  sectionLabel: { fontFamily: "'Space Mono', monospace", fontSize: 9, color: "#444", letterSpacing: "3px" },
  mechRow: { display: "flex", alignItems: "center", gap: 10 },
  mechName: { fontSize: 12, color: "#888", width: 160, flexShrink: 0 },
  mechBar: { flex: 1, height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" },
  mechFill: { height: "100%", background: "#c8f542", borderRadius: 2, transition: "width 0.5s ease" },
  mechCount: { fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#444", width: 24, textAlign: "right" },
  evasionItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  evasionBullet: { color: "#f87171", fontSize: 14, flexShrink: 0, marginTop: 1 },
  evasionItemText: { fontSize: 13, color: "#666", lineHeight: 1.5 },
  combatHistItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  combatHistIcon: { fontFamily: "'Space Mono', monospace", fontSize: 13, flexShrink: 0, marginTop: 1 },
  combatHistText: { fontSize: 13, color: "#666", lineHeight: 1.5 },
  profileEmpty: { textAlign: "center", padding: "40px 20px" },
  profileEmptyText: { fontSize: 14, color: "#444", lineHeight: 1.7, marginBottom: 16 },
  profileEmptyBtn: { background: "none", border: "1px solid #333", color: "#666", padding: "10px 20px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  resetBtn: { background: "none", border: "1px solid #1e1e1e", color: "#333", padding: "10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace", letterSpacing: "1px", width: "100%" },
  resetConfirm: { padding: "14px 16px", background: "#0d0d0d", border: "1px solid #2a1a1a", borderRadius: 8 },
  resetConfirmText: { fontSize: 12, color: "#666" },
  resetConfirmYes: { flex: 1, padding: "8px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  resetConfirmNo: { flex: 1, padding: "8px", background: "none", border: "1px solid #222", color: "#555", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
};
