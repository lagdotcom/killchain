import { useId, useRef, useState } from "react";
import { useSelector } from "react-redux";

import type {
  Cells,
  MapId,
  ScenarioId,
  UnitDefinitionId,
} from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import type { DeploymentZone } from "../killchain/types.js";
import { generateGridMap } from "../sampleData.js";
import { loadScenarioAction } from "../state/actions.js";
import { upsertMap } from "../state/maps.js";
import { upsertDefinitions } from "../state/roster.js";
import {
  addScenario,
  removeScenario,
  type RuleOverrides,
  type Scenario,
  type ScenarioSideSetup,
  updateScenario,
  upsertScenario,
} from "../state/scenarios.js";
import {
  selectAllDefinitions,
  selectAllMaps,
  selectAllScenarios,
  selectBattle,
} from "../state/selectors.js";
import type { AiPersonality } from "../state/sides.js";
import { useAppDispatch } from "../state/store.js";
import type { ZoneInfo } from "./MapOverlays.js";
import type { PlacedUnit } from "./ScenarioMapEditor.js";
import { ScenarioMapEditor } from "./ScenarioMapEditor.js";

// ---------------------------------------------------------------------------
// Local form types
// ---------------------------------------------------------------------------

interface UnitSetupForm {
  definitionId: UnitDefinitionId;
  name: string;
  shortName: string;
  missile: boolean;
  x?: Cells;
  y?: Cells;
}

interface SideForm {
  name: string;
  colour: string;
  units: UnitSetupForm[];
  /** Tracks the dropdown selection for "add unit" — not saved to state. */
  addDefId: string;
  deploymentZone?: DeploymentZone;
  aiPersonality?: AiPersonality;
  allianceId?: number;
}

interface RuleFormState {
  turnLimit: string;
  cavalryCharge: boolean;
  archerMeleePenalty: boolean;
  flanking: boolean;
  meleeEngagement: boolean;
}

interface ScenarioForm {
  name: string;
  mapId: string;
  sides: SideForm[];
  rules: RuleFormState;
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

const blankSide = (n: number): SideForm => ({
  name: `Side ${n}`,
  colour: n === 1 ? "#4488ee" : n === 2 ? "#ee4444" : "#44bb44",
  units: [],
  addDefId: "",
});

const defaultRules: RuleFormState = {
  turnLimit: "",
  cavalryCharge: true,
  archerMeleePenalty: true,
  flanking: true,
  meleeEngagement: false,
};

const blankForm: ScenarioForm = {
  name: "",
  mapId: "",
  sides: [blankSide(1), blankSide(2)],
  rules: defaultRules,
};

function scenarioToForm(s: Scenario): ScenarioForm {
  return {
    name: s.name,
    mapId: s.mapId,
    sides: s.sides.map((side) => ({
      name: side.name,
      colour: side.colour,
      addDefId: "",
      ...(side.deploymentZone !== undefined
        ? { deploymentZone: side.deploymentZone }
        : {}),
      ...(side.aiPersonality !== undefined
        ? { aiPersonality: side.aiPersonality }
        : {}),
      ...(side.allianceId !== undefined ? { allianceId: side.allianceId } : {}),
      units: side.units.map((u) => ({
        definitionId: u.definitionId,
        name: u.name,
        shortName: u.shortName ?? "",
        missile: u.missile ?? false,
        ...(u.x !== undefined && u.y !== undefined ? { x: u.x, y: u.y } : {}),
      })),
    })),
    rules: {
      turnLimit:
        s.rules?.turnLimit !== undefined ? String(s.rules.turnLimit) : "",
      cavalryCharge: s.rules?.cavalryCharge ?? true,
      archerMeleePenalty: s.rules?.archerMeleePenalty ?? true,
      flanking: s.rules?.flanking ?? true,
      meleeEngagement: s.rules?.meleeEngagement ?? false,
    },
  };
}

function ruleFormToOverrides(r: RuleFormState): RuleOverrides {
  const parsed = r.turnLimit.trim() !== "" ? Number(r.turnLimit) : undefined;
  return {
    cavalryCharge: r.cavalryCharge,
    archerMeleePenalty: r.archerMeleePenalty,
    flanking: r.flanking,
    meleeEngagement: r.meleeEngagement,
    ...(parsed !== undefined &&
      !isNaN(parsed) &&
      parsed > 0 && { turnLimit: parsed }),
  };
}

function formToScenarioData(form: ScenarioForm): Omit<Scenario, "id"> {
  return {
    name: form.name.trim() || "Unnamed Scenario",
    mapId: form.mapId as MapId,
    sides: form.sides.map(
      (side, id): ScenarioSideSetup => ({
        id,
        name: side.name.trim() || `Side ${id + 1}`,
        colour: side.colour,
        ...(side.deploymentZone !== undefined && {
          deploymentZone: side.deploymentZone,
        }),
        ...(side.aiPersonality !== undefined && {
          aiPersonality: side.aiPersonality,
        }),
        ...(side.allianceId !== undefined && { allianceId: side.allianceId }),
        units: side.units.map((u) => ({
          definitionId: u.definitionId,
          name: u.name.trim() || "Unit",
          ...(u.shortName.trim() && { shortName: u.shortName.trim() }),
          ...(u.missile && { missile: true }),
          ...(u.x !== undefined && u.y !== undefined ? { x: u.x, y: u.y } : {}),
        })),
      }),
    ),
    rules: ruleFormToOverrides(form.rules),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateSide(
  sides: SideForm[],
  i: number,
  patch: Partial<SideForm>,
): SideForm[] {
  return sides.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
}

function updateUnit(
  sides: SideForm[],
  si: number,
  ui: number,
  patch: Partial<UnitSetupForm>,
): SideForm[] {
  return sides.map((s, idx) =>
    idx !== si
      ? s
      : {
          ...s,
          units: s.units.map((u, uidx) =>
            uidx !== ui ? u : { ...u, ...patch },
          ),
        },
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
}

const aiPersonalityOptions: Array<{
  value: AiPersonality | "";
  label: string;
}> = [
  { value: "", label: "Human" },
  { value: "aggressive", label: "AI — Aggressive" },
  { value: "defensive", label: "AI — Defensive" },
  { value: "berserker", label: "AI — Berserker" },
];

export function ScenarioManager({ onClose }: Props) {
  const dispatch = useAppDispatch();
  const scenarios = useSelector(selectAllScenarios);
  const maps = useSelector(selectAllMaps);
  const definitions = useSelector(selectAllDefinitions);
  const battle = useSelector(selectBattle);

  const [form, setForm] = useState<ScenarioForm | null>(null);
  const [editingId, setEditingId] = useState<ScenarioId | null>(null);
  const [zoneSideIdx, setZoneSideIdx] = useState(-1);
  const importRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const mapName = (id: string) => maps.find((m) => m.id === id)?.name ?? "—";

  // ---- List actions --------------------------------------------------------

  function handleLoad(s: Scenario) {
    if (
      battle.phase !== Phase.Placement &&
      !confirm("Loading a scenario will restart the current battle. Continue?")
    )
      return;
    dispatch(loadScenarioAction(s));
    onClose();
  }

  function handleDelete(id: ScenarioId) {
    if (confirm("Delete this scenario?")) dispatch(removeScenario(id));
  }

  /** Strip cells from seeded maps — they're fully reproducible from the seed. */
  function compactMap(map: (typeof maps)[number]) {
    if (map.seed === undefined) return map;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cells: _cells, ...rest } = map;
    return rest;
  }

  function buildPkg(s: Scenario) {
    const map = maps.find((m) => m.id === s.mapId);
    const usedDefIds = new Set(
      s.sides.flatMap((side) => side.units.map((u) => u.definitionId)),
    );
    const usedDefs = definitions.filter((d) => usedDefIds.has(d.id));
    return {
      version: 1,
      scenario: s,
      ...(map && { map: compactMap(map) }),
      ...(usedDefs.length > 0 && { definitions: usedDefs }),
    };
  }

  function handleExport(s: Scenario) {
    const pkg = buildPkg(s);
    const json = JSON.stringify(pkg, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportAll() {
    const pkgs = scenarios.map(buildPkg);
    const json = JSON.stringify(pkgs, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as unknown;
        const list: unknown[] = Array.isArray(raw) ? raw : [raw];
        for (const item of list) {
          if (
            typeof item !== "object" ||
            item === null ||
            (item as Record<string, unknown>).version !== 1 ||
            !(item as Record<string, unknown>).scenario
          )
            throw new Error(
              "Invalid format — expected {version:1, scenario, ...}",
            );

          const pkg = item as Record<string, unknown>;

          if (pkg.map) {
            const m = pkg.map as Record<string, unknown>;
            // Seeded maps exported without cells — regenerate from seed
            if (m.seed !== undefined && !m.cells) {
              dispatch(
                upsertMap(
                  generateGridMap(
                    m.id as string,
                    m.cellSize as number,
                    m.width as number,
                    m.height as number,
                    m.seed as number,
                    m.name as string | undefined,
                  ),
                ),
              );
            } else {
              dispatch(upsertMap(pkg.map as Parameters<typeof upsertMap>[0]));
            }
          }
          if (pkg.definitions)
            dispatch(
              upsertDefinitions(
                pkg.definitions as Parameters<typeof upsertDefinitions>[0],
              ),
            );
          dispatch(
            upsertScenario(
              pkg.scenario as Parameters<typeof upsertScenario>[0],
            ),
          );
        }
      } catch (err) {
        alert(
          `Invalid scenario JSON: ${err instanceof Error ? err.message : err}`,
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ---- Editor actions ------------------------------------------------------

  function handleNew() {
    setEditingId(null);
    setZoneSideIdx(-1);
    setForm({ ...blankForm, mapId: maps[0]?.id ?? "" });
  }

  function handleEdit(s: Scenario) {
    setEditingId(s.id);
    setZoneSideIdx(-1);
    setForm(scenarioToForm(s));
  }

  function handleCancelEdit() {
    setForm(null);
    setEditingId(null);
    setZoneSideIdx(-1);
  }

  function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!form) return;
    const data = formToScenarioData(form);
    if (editingId) {
      dispatch(updateScenario({ id: editingId, changes: data }));
    } else {
      dispatch(addScenario(data));
    }
    setForm(null);
    setEditingId(null);
    setZoneSideIdx(-1);
  }

  // ---- Side / unit editing helpers -----------------------------------------

  function addSide() {
    if (!form || form.sides.length >= 4) return;
    setForm((f) =>
      f ? { ...f, sides: [...f.sides, blankSide(f.sides.length + 1)] } : f,
    );
  }

  function removeSide(si: number) {
    if (!form || form.sides.length <= 2) return;
    setForm((f) =>
      f ? { ...f, sides: f.sides.filter((_, i) => i !== si) } : f,
    );
  }

  function addUnit(si: number) {
    if (!form) return;
    const defId = form.sides[si]!.addDefId as UnitDefinitionId;
    if (!defId) return;
    const def = definitions.find((d) => d.id === defId);
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        sides: updateSide(f.sides, si, {
          units: [
            ...f.sides[si]!.units,
            {
              definitionId: defId,
              name: def?.type.name ?? "Unit",
              shortName: "",
              missile: false,
            },
          ],
          addDefId: "",
        }),
      };
    });
  }

  function removeUnit(si: number, ui: number) {
    if (!form) return;
    setForm((f) =>
      f
        ? {
            ...f,
            sides: updateSide(f.sides, si, {
              units: f.sides[si]!.units.filter((_, i) => i !== ui),
            }),
          }
        : f,
    );
  }

  function unplace(si: number, ui: number) {
    setForm((f) =>
      f
        ? {
            ...f,
            sides: f.sides.map((s, idx) =>
              idx !== si
                ? s
                : {
                    ...s,
                    units: s.units.map((u, uidx) =>
                      uidx !== ui
                        ? u
                        : {
                            definitionId: u.definitionId,
                            name: u.name,
                            shortName: u.shortName,
                            missile: u.missile,
                          },
                    ),
                  },
            ),
          }
        : f,
    );
  }

  // ---- Render: Editor view -------------------------------------------------

  if (form) {
    const selectedMap = maps.find((m) => m.id === form.mapId);

    const placedUnits: PlacedUnit[] = form.sides.flatMap((side, si) =>
      side.units.flatMap((u, ui) =>
        u.x !== undefined && u.y !== undefined
          ? [
              {
                sideIdx: si,
                unitIdx: ui,
                colour: side.colour,
                label: u.shortName.trim()
                  ? u.shortName.trim()
                  : u.name
                      .split(" ")
                      .map((w) => w[0])
                      .join(""),
                x: u.x,
                y: u.y,
              } satisfies PlacedUnit,
            ]
          : [],
      ),
    );

    const zones: ZoneInfo[] = form.sides
      .map((side, si) =>
        side.deploymentZone
          ? { key: String(si), colour: side.colour, zone: side.deploymentZone }
          : null,
      )
      .filter((z): z is ZoneInfo => z !== null);

    return (
      <div className="manager-page">
        <div className="manager-header">
          <button className="back-btn" onClick={handleCancelEdit}>
            ← Back
          </button>
          <h2>{editingId ? "Edit Scenario" : "New Scenario"}</h2>
          <div className="manager-header-actions">
            <button form={formId} type="submit" disabled={!form.mapId}>
              {editingId ? "Save changes" : "Create scenario"}
            </button>
          </div>
        </div>

        <form className="scenario-editor" id={formId} onSubmit={handleSave}>
          {/* Top row: Name + Map */}
          <div className="scenario-editor-top">
            <label className="scenario-label-wide">
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => (f ? { ...f, name: e.target.value } : f));
                }}
                placeholder="Scenario name"
              />
            </label>
            <label>
              Map
              <select
                value={form.mapId}
                onChange={(e) => {
                  setForm((f) => (f ? { ...f, mapId: e.target.value } : f));
                }}
              >
                <option value="">— select map —</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Main area: side panel + map panel */}
          <div className="scenario-editor-main">
            {/* Side panel */}
            <div className="scenario-side-panel">
              {form.sides.map((side, si) => (
                <div key={si} className="scenario-side">
                  <div className="scenario-side-header">
                    <span className="scenario-side-label">Side {si + 1}</span>
                    <input
                      type="text"
                      className="scenario-side-name"
                      value={side.name}
                      onChange={(e) => {
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              sides: updateSide(f.sides, si, {
                                name: e.target.value,
                              }),
                            },
                        );
                      }}
                    />
                    <input
                      type="color"
                      value={side.colour}
                      onChange={(e) => {
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              sides: updateSide(f.sides, si, {
                                colour: e.target.value,
                              }),
                            },
                        );
                      }}
                      title="Side colour"
                    />
                    {form.sides.length > 2 && (
                      <button
                        type="button"
                        className="scenario-remove-btn"
                        onClick={() => {
                          removeSide(si);
                        }}
                        title="Remove side"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* AI personality row */}
                  <div className="scenario-zone-row">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <span className="scenario-zone-label">Player:</span>
                      <select
                        value={side.aiPersonality ?? ""}
                        onChange={(e) => {
                          const val = e.target.value as AiPersonality | "";
                          setForm((f) => {
                            if (!f) return f;
                            return {
                              ...f,
                              sides: f.sides.map((s, idx) => {
                                if (idx !== si) return s;
                                if (val === "") {
                                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                  const { aiPersonality: _ap, ...rest } = s;
                                  return rest;
                                }
                                return { ...s, aiPersonality: val };
                              }),
                            };
                          });
                        }}
                      >
                        {aiPersonalityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Alliance/team row */}
                  <div className="scenario-zone-row">
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <span className="scenario-zone-label">Team:</span>
                      <select
                        value={side.allianceId ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setForm((f) => {
                            if (!f) return f;
                            return {
                              ...f,
                              sides: f.sides.map((s, idx) => {
                                if (idx !== si) return s;
                                if (raw === "") {
                                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                  const { allianceId: _aid, ...rest } = s;
                                  return rest;
                                }
                                return { ...s, allianceId: Number(raw) };
                              }),
                            };
                          });
                        }}
                      >
                        <option value="">None</option>
                        <option value="1">Team 1</option>
                        <option value="2">Team 2</option>
                        <option value="3">Team 3</option>
                        <option value="4">Team 4</option>
                      </select>
                    </label>
                  </div>

                  {/* Deployment zone row */}
                  <div className="scenario-zone-row">
                    <span className="scenario-zone-label">
                      Zone:{" "}
                      {side.deploymentZone
                        ? `${side.deploymentZone.x},${side.deploymentZone.y} ${side.deploymentZone.width}×${side.deploymentZone.height}`
                        : "none"}
                    </span>
                    {zoneSideIdx === si ? (
                      <button
                        type="button"
                        className="scenario-zone-btn active"
                        onClick={() => {
                          setZoneSideIdx(-1);
                        }}
                      >
                        Done
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="scenario-zone-btn"
                          onClick={() => {
                            setZoneSideIdx(si);
                          }}
                        >
                          {side.deploymentZone ? "Edit" : "Define"}
                        </button>
                        {side.deploymentZone && (
                          <button
                            type="button"
                            className="scenario-remove-btn"
                            title="Clear zone"
                            onClick={() => {
                              setForm((f) => {
                                if (!f) return f;
                                return {
                                  ...f,
                                  sides: f.sides.map((s, idx) => {
                                    if (idx !== si) return s;
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const { deploymentZone: _dz, ...rest } = s;
                                    return rest;
                                  }),
                                };
                              });
                            }}
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Unit list */}
                  <div className="scenario-unit-list">
                    {side.units.length === 0 && (
                      <span className="scenario-empty-units">No units</span>
                    )}
                    {side.units.map((u, ui) => {
                      const def = definitions.find(
                        (d) => d.id === u.definitionId,
                      );
                      const isPlaced = u.x !== undefined && u.y !== undefined;
                      return (
                        <div
                          key={ui}
                          className={`scenario-unit-row${isPlaced ? " placed" : ""}`}
                        >
                          <div
                            className="scenario-unit-row-top"
                            draggable={!isPlaced}
                            onDragStart={
                              !isPlaced
                                ? (e) => {
                                    e.dataTransfer.setData(
                                      "scenarioRef",
                                      `${si}:${ui}`,
                                    );
                                    e.dataTransfer.effectAllowed = "move";
                                  }
                                : undefined
                            }
                          >
                            {!isPlaced && (
                              <span className="drag-handle">⠿</span>
                            )}
                            <input
                              type="text"
                              className="scenario-unit-name-input"
                              value={u.name}
                              placeholder="Unit name"
                              onChange={(e) => {
                                setForm(
                                  (f) =>
                                    f && {
                                      ...f,
                                      sides: updateUnit(f.sides, si, ui, {
                                        name: e.target.value,
                                      }),
                                    },
                                );
                              }}
                            />
                            {isPlaced && (
                              <span className="scenario-unit-pos">
                                @{u.x},{u.y}
                              </span>
                            )}
                            <button
                              type="button"
                              className="scenario-remove-btn"
                              onClick={() => {
                                if (isPlaced) {
                                  unplace(si, ui);
                                } else {
                                  removeUnit(si, ui);
                                }
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div className="scenario-unit-row-bottom">
                            <span className="scenario-unit-type">
                              {def?.type.name ?? String(u.definitionId)}
                            </span>
                            <input
                              type="text"
                              className="scenario-unit-short-input"
                              value={u.shortName}
                              placeholder="Abbr"
                              title="Short name (1-4 chars, shown on token)"
                              maxLength={4}
                              onChange={(e) => {
                                setForm(
                                  (f) =>
                                    f && {
                                      ...f,
                                      sides: updateUnit(f.sides, si, ui, {
                                        shortName: e.target.value,
                                      }),
                                    },
                                );
                              }}
                            />
                            <label
                              className="scenario-unit-missile-label"
                              title="Missile weapon"
                            >
                              <input
                                type="checkbox"
                                checked={u.missile}
                                onChange={(e) => {
                                  setForm(
                                    (f) =>
                                      f && {
                                        ...f,
                                        sides: updateUnit(f.sides, si, ui, {
                                          missile: e.target.checked,
                                        }),
                                      },
                                  );
                                }}
                              />
                              Missile
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add unit row */}
                  <div className="scenario-add-unit-row">
                    <select
                      value={side.addDefId}
                      onChange={(e) => {
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              sides: updateSide(f.sides, si, {
                                addDefId: e.target.value,
                              }),
                            },
                        );
                      }}
                    >
                      <option value="">— add unit from roster —</option>
                      {definitions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.type.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!side.addDefId}
                      onClick={() => {
                        addUnit(si);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}

              {form.sides.length < 4 && (
                <button
                  type="button"
                  className="scenario-add-side-btn"
                  onClick={addSide}
                >
                  + Add side
                </button>
              )}
            </div>

            {/* Map panel */}
            <div className="scenario-map-panel">
              {selectedMap ? (
                <ScenarioMapEditor
                  map={selectedMap}
                  placedUnits={placedUnits}
                  zones={zones}
                  zoneSideIdx={zoneSideIdx}
                  onPlace={(x, y, si, ui) => {
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            sides: f.sides.map((s, idx) =>
                              idx !== si
                                ? s
                                : {
                                    ...s,
                                    units: s.units.map((u, uidx) =>
                                      uidx !== ui ? u : { ...u, x, y },
                                    ),
                                  },
                            ),
                          }
                        : f,
                    );
                  }}
                  onUnplace={(si, ui) => {
                    unplace(si, ui);
                  }}
                  onZoneDefined={(zone) => {
                    setForm((f) =>
                      f
                        ? {
                            ...f,
                            sides: updateSide(f.sides, zoneSideIdx, {
                              deploymentZone: zone,
                            }),
                          }
                        : f,
                    );
                    setZoneSideIdx(-1);
                  }}
                />
              ) : (
                <span className="scenario-map-empty">
                  Select a map above to begin placing units
                </span>
              )}
            </div>
          </div>

          {/* Optional Rules */}
          <div className="scenario-rules-section">
            <fieldset>
              <legend>Optional rules</legend>
              <div className="scenario-rules-grid">
                {(
                  [
                    [
                      "cavalryCharge",
                      "Cavalry charge bonus (+1 when mounted and moved)",
                    ],
                    [
                      "archerMeleePenalty",
                      "Archer melee penalty (-1 for missile units in melee)",
                    ],
                    ["flanking", "Flanking bonus (+1 against flanked units)"],
                    [
                      "meleeEngagement",
                      "Melee engagement (restrict disengagement from melee)",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="scenario-rule-check">
                    <input
                      type="checkbox"
                      checked={form.rules[key]}
                      onChange={(e) => {
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                rules: { ...f.rules, [key]: e.target.checked },
                              }
                            : f,
                        );
                      }}
                    />
                    {label}
                  </label>
                ))}
                <label className="scenario-rule-check">
                  <span>Turn limit:</span>
                  <input
                    type="number"
                    min={1}
                    value={form.rules.turnLimit}
                    placeholder="none"
                    onChange={(e) => {
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              rules: { ...f.rules, turnLimit: e.target.value },
                            }
                          : f,
                      );
                    }}
                    style={{ width: 64, marginLeft: 6 }}
                  />
                </label>
              </div>
            </fieldset>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="manager-page">
      <div className="manager-header">
        <button className="back-btn" onClick={onClose}>
          ← Back
        </button>
        <h2>Scenarios</h2>
        <div className="manager-header-actions">
          <button onClick={handleNew}>+ New</button>
          <button onClick={handleExportAll} disabled={scenarios.length === 0}>
            Export all
          </button>
          <label className="import-btn">
            Import JSON
            <input
              ref={importRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>
      <div className="manager-body">
        <div className="manager-body-inner scenario-manager-inner">
          <div className="scenario-list">
            {scenarios.length === 0 && (
              <p className="roster-empty">
                No scenarios yet. Create one or import from JSON.
              </p>
            )}
            {scenarios.map((s) => {
              const totalUnits = s.sides.reduce(
                (n, side) => n + side.units.length,
                0,
              );
              const prePlaced = s.sides.reduce(
                (n, side) =>
                  n + side.units.filter((u) => u.x !== undefined).length,
                0,
              );
              return (
                <div key={s.id} className="scenario-item">
                  <div className="scenario-item-info">
                    <span className="scenario-item-name">{s.name}</span>
                    <span className="scenario-item-meta">
                      Map: {mapName(s.mapId)} · {s.sides.length} sides ·{" "}
                      {totalUnits} units
                      {prePlaced > 0 && `, ${prePlaced} pre-placed`}
                    </span>
                    <span className="scenario-item-sides">
                      {s.sides.map((side, i) => (
                        <span
                          key={i}
                          className="scenario-side-chip"
                          style={{ background: side.colour }}
                        >
                          {side.name}
                          {side.aiPersonality && (
                            <span className="scenario-side-ai-badge"> AI</span>
                          )}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="scenario-item-actions">
                    <button
                      onClick={() => {
                        handleLoad(s);
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        handleEdit(s);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleExport(s);
                      }}
                    >
                      Export
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(s.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
