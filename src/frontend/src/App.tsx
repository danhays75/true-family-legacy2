import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useState } from "react";
import { EdgeKind, createActor } from "./backend";
import type { EdgeRecord, FamilyRecord } from "./backend";

type PlantResult = { familyId: string; canisterId: string } | null;
type PingMap = Record<string, string>;

function formatTimestamp(ns: bigint): string {
  try {
    const ms = Number(ns / 1_000_000n);
    return new Date(ms).toLocaleString();
  } catch {
    return String(ns);
  }
}

function edgeKindLabel(kind: EdgeKind): string {
  return String(kind);
}

export default function App() {
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [edges, setEdges] = useState<EdgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [buildStamp, setBuildStamp] = useState("");

  // Plant Tree form
  const [plantRootName, setPlantRootName] = useState("");
  const [plantParent, setPlantParent] = useState("");
  const [plantResult, setPlantResult] = useState<PlantResult>(null);
  const [plantError, setPlantError] = useState("");
  const [planting, setPlanting] = useState(false);

  // Link form
  const [linkFrom, setLinkFrom] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [linkKind, setLinkKind] = useState<"childOf" | "spouseOriginOf">(
    "childOf",
  );
  const [linkVia, setLinkVia] = useState("");
  const [linkResult, setLinkResult] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");
  const [linking, setLinking] = useState(false);

  // Ping state per familyId
  const [pings, setPings] = useState<PingMap>({});
  const [pinging, setPinging] = useState<Record<string, boolean>>({});

  const { actor } = useActor(createActor);

  const loadFamilies = useCallback(async () => {
    if (!actor) return;
    const result = await actor.listFamilies();
    setFamilies(result);
  }, [actor]);

  const loadEdges = useCallback(async () => {
    if (!actor) return;
    const result = await actor.listEdges();
    setEdges(result);
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    Promise.all([
      actor.listFamilies(),
      actor.listEdges(),
      actor.getBuildStamp(),
    ]).then(([fams, eds, stamp]) => {
      setFamilies(fams);
      setEdges(eds);
      setBuildStamp(stamp);
      setLoading(false);
    });
  }, [actor]);

  async function handlePlant(e: React.FormEvent) {
    e.preventDefault();
    if (!plantRootName.trim()) return;
    setPlanting(true);
    setPlantResult(null);
    setPlantError("");
    try {
      if (!actor) {
        setPlantError("Actor not ready");
        return;
      }
      const parentArg: string | null = plantParent || null;
      const result = await actor.plantTree(plantRootName.trim(), parentArg);
      if (result.__kind__ === "ok") {
        const [familyId, canisterPrincipal] = result.ok;
        setPlantResult({ familyId, canisterId: canisterPrincipal.toString() });
        setPlantRootName("");
        setPlantParent("");
        await Promise.all([loadFamilies(), loadEdges()]);
      } else {
        setPlantError(result.err);
      }
    } catch (err) {
      setPlantError(String(err));
    } finally {
      setPlanting(false);
    }
  }

  async function handlePing(familyId: string) {
    setPinging((p) => ({ ...p, [familyId]: true }));
    try {
      if (!actor) {
        setPings((p) => ({ ...p, [familyId]: "Error: Actor not ready" }));
        return;
      }
      const result = await actor.pingChild(familyId);
      if (result.__kind__ === "ok") {
        setPings((p) => ({ ...p, [familyId]: result.ok }));
      } else {
        setPings((p) => ({ ...p, [familyId]: `Error: ${result.err}` }));
      }
    } catch (err) {
      setPings((p) => ({ ...p, [familyId]: `Error: ${String(err)}` }));
    } finally {
      setPinging((p) => ({ ...p, [familyId]: false }));
    }
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkFrom || !linkTo || !linkVia.trim()) return;
    setLinking(true);
    setLinkResult(null);
    setLinkError("");
    try {
      if (!actor) {
        setLinkError("Actor not ready");
        return;
      }
      const kindVariant: EdgeKind =
        String(linkKind) === "childOf"
          ? EdgeKind.childOf
          : EdgeKind.spouseOriginOf;
      const result = await actor.linkFamilies(
        linkFrom,
        linkTo,
        kindVariant,
        linkVia.trim(),
      );
      if (result.__kind__ === "ok") {
        setLinkResult("Linked!");
        setLinkVia("");
        await loadEdges();
      } else {
        setLinkError(result.err);
      }
    } catch (err) {
      setLinkError(String(err));
    } finally {
      setLinking(false);
    }
  }

  const cell: React.CSSProperties = { padding: "4px 8px" };
  const th: React.CSSProperties = {
    ...cell,
    borderBottom: "2px solid #ccc",
    textAlign: "left",
  };
  const td: React.CSSProperties = { ...cell, borderBottom: "1px solid #eee" };

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: "monospace",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
        True Family Legacy — Factory Diagnostic Harness
      </h1>
      {buildStamp && (
        <p style={{ fontSize: 12, marginBottom: 24, fontFamily: "monospace" }}>
          Factory build: {buildStamp}
        </p>
      )}

      {/* SECTION 1: Plant a Tree */}
      <section
        style={{ marginBottom: 32, padding: 16, border: "1px solid #ccc" }}
      >
        <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 12 }}>
          1. Plant a Tree
        </h2>
        <form
          onSubmit={handlePlant}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 420,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>Root Name</span>
            <input
              data-ocid="plant.input"
              type="text"
              value={plantRootName}
              onChange={(e) => setPlantRootName(e.target.value)}
              placeholder="e.g. Adam Tree"
              style={{
                padding: "4px 8px",
                border: "1px solid #999",
                fontFamily: "monospace",
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>Parent Family</span>
            <select
              data-ocid="plant.parent_select"
              value={plantParent}
              onChange={(e) => setPlantParent(e.target.value)}
              style={{
                padding: "4px 8px",
                border: "1px solid #999",
                fontFamily: "monospace",
              }}
            >
              <option value="">none</option>
              {families.map((f) => (
                <option key={f.familyId} value={f.familyId}>
                  {f.familyId} — {f.rootName}
                </option>
              ))}
            </select>
          </label>
          <button
            data-ocid="plant.submit_button"
            type="submit"
            disabled={planting || !plantRootName.trim()}
            style={{
              padding: "6px 16px",
              cursor: planting ? "wait" : "pointer",
              fontFamily: "monospace",
              alignSelf: "flex-start",
            }}
          >
            {planting ? "Planting…" : "Plant Tree"}
          </button>
        </form>
        {plantResult && (
          <p
            data-ocid="plant.success_state"
            style={{ marginTop: 8, color: "green" }}
          >
            Created: familyId={plantResult.familyId} canisterId=
            {plantResult.canisterId}
          </p>
        )}
        {plantError && (
          <p
            data-ocid="plant.error_state"
            style={{ marginTop: 8, color: "red" }}
          >
            Error: {plantError}
          </p>
        )}
      </section>

      {/* SECTION 2: Families */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>
          2. Families
        </h2>
        {loading ? (
          <p data-ocid="families.loading_state">Loading…</p>
        ) : families.length === 0 ? (
          <p data-ocid="families.empty_state">No families yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              data-ocid="families.table"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>familyId</th>
                  <th style={th}>canisterId</th>
                  <th style={th}>rootName</th>
                  <th style={th}>parentFamilyId</th>
                  <th style={th}>createdAt</th>
                  <th style={th}>Ping</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f, idx) => (
                  <tr key={f.familyId} data-ocid={`families.item.${idx + 1}`}>
                    <td style={td}>{f.familyId}</td>
                    <td
                      style={{ ...td, wordBreak: "break-all", maxWidth: 180 }}
                    >
                      {f.canisterId.toString()}
                    </td>
                    <td style={td}>{f.rootName}</td>
                    <td style={td}>{f.parentFamilyId ?? "\u2014"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {formatTimestamp(f.createdAt)}
                    </td>
                    <td style={{ ...td, minWidth: 60 }}>
                      <button
                        data-ocid={`families.ping_button.${idx + 1}`}
                        type="button"
                        onClick={() => handlePing(f.familyId)}
                        disabled={!!pinging[f.familyId]}
                        style={{
                          cursor: pinging[f.familyId] ? "wait" : "pointer",
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        {pinging[f.familyId] ? "…" : "Ping"}
                      </button>
                      {pings[f.familyId] !== undefined &&
                        pings[f.familyId] !== "" && (
                          <div
                            data-ocid={`families.ping_result.${idx + 1}`}
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                              color: pings[f.familyId].startsWith("Error")
                                ? "red"
                                : "green",
                              maxWidth: 280,
                              wordBreak: "break-word",
                            }}
                          >
                            {pings[f.familyId]}
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3: Relationship Edges */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>
          3. Relationship Edges
        </h2>
        {edges.length === 0 ? (
          <p data-ocid="edges.empty_state">No edges yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              data-ocid="edges.table"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>fromFamilyId</th>
                  <th style={th}>toFamilyId</th>
                  <th style={th}>kind</th>
                  <th style={th}>viaPersonName</th>
                </tr>
              </thead>
              <tbody>
                {edges.map((e, idx) => (
                  <tr
                    key={`${e.fromFamilyId}-${e.toFamilyId}-${e.viaPersonName}`}
                    data-ocid={`edges.item.${idx + 1}`}
                  >
                    <td style={td}>{e.fromFamilyId}</td>
                    <td style={td}>{e.toFamilyId}</td>
                    <td style={td}>{edgeKindLabel(e.kind)}</td>
                    <td style={td}>{e.viaPersonName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 4: Link Two Families */}
      <section
        style={{ marginBottom: 32, padding: 16, border: "1px solid #ccc" }}
      >
        <h2 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 12 }}>
          4. Link Two Families
        </h2>
        <form
          onSubmit={handleLink}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 420,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>From Family</span>
            <select
              data-ocid="link.from_select"
              value={linkFrom}
              onChange={(e) => setLinkFrom(e.target.value)}
              style={{
                padding: "4px 8px",
                border: "1px solid #999",
                fontFamily: "monospace",
              }}
            >
              <option value="">— select —</option>
              {families.map((f) => (
                <option key={f.familyId} value={f.familyId}>
                  {f.familyId} — {f.rootName}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>To Family</span>
            <select
              data-ocid="link.to_select"
              value={linkTo}
              onChange={(e) => setLinkTo(e.target.value)}
              style={{
                padding: "4px 8px",
                border: "1px solid #999",
                fontFamily: "monospace",
              }}
            >
              <option value="">— select —</option>
              {families.map((f) => (
                <option key={f.familyId} value={f.familyId}>
                  {f.familyId} — {f.rootName}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>Kind</span>
            <select
              data-ocid="link.kind_select"
              value={linkKind}
              onChange={(e) =>
                setLinkKind(e.target.value as "childOf" | "spouseOriginOf")
              }
              style={{
                padding: "4px 8px",
                border: "1px solid #999",
                fontFamily: "monospace",
              }}
            >
              <option value="childOf">childOf</option>
              <option value="spouseOriginOf">spouseOriginOf</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span>Via Person Name</span>
            <input
              data-ocid="link.via_input"
              type="text"
              value={linkVia}
              onChange={(e) => setLinkVia(e.target.value)}
              placeholder="e.g. John Smith"
              style={{
                padding: "4px 8px",
                border: "1px solid #999",
                fontFamily: "monospace",
              }}
            />
          </label>
          <button
            data-ocid="link.submit_button"
            type="submit"
            disabled={linking || !linkFrom || !linkTo || !linkVia.trim()}
            style={{
              padding: "6px 16px",
              cursor: linking ? "wait" : "pointer",
              fontFamily: "monospace",
              alignSelf: "flex-start",
            }}
          >
            {linking ? "Linking…" : "Link Families"}
          </button>
        </form>
        {linkResult && (
          <p
            data-ocid="link.success_state"
            style={{ marginTop: 8, color: "green" }}
          >
            {linkResult}
          </p>
        )}
        {linkError && (
          <p
            data-ocid="link.error_state"
            style={{ marginTop: 8, color: "red" }}
          >
            Error: {linkError}
          </p>
        )}
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "16px",
          fontSize: "12px",
          color: "#888",
        }}
      >
        Built with{" "}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer">
          Caffeine
        </a>
      </footer>
    </div>
  );
}
