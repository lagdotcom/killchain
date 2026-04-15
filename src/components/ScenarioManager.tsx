import { useId, useRef, useState } from "react";
import { useSelector } from "react-redux";

import type { Cells, MapId, ScenarioId, SideId, UnitDefinitionId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import { loadScenarioAction } from "../state/actions.js";
import {
  addScenario,
  removeScenario,
  setAllScenarios,
  updateScenario,
  type Scenario,
  type ScenarioSideSetup,
} from "../state/scenarios.js";
import {
  selectAllDefinitions,
  selectAllMaps,
  selectAllScenarios,
  selectBattle,
} from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

// ---------------------------------------------------------------------------
// Local form types
// ---------------------------------------------------------------------------

interface UnitSetupForm {
  definitionId: UnitDefinitionId;
  prePlaced: boolean;
  x: string;
  y: string;
}

interface SideForm {
  name: string;
  colour: string;
  units: UnitSetupForm[];
  /** Tracks the dropdown selection for "add unit" — not saved to state. */
  addDefId: string;
}

interface ScenarioForm {
  name: string;
  mapId: string;
  sides: SideForm[];
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

const blankForm: ScenarioForm = {
  name: "",
  mapId: "",
  sides: [blankSide(1), blankSide(2)],
};

function scenarioToForm(s: Scenario): ScenarioForm {
  return {
    name: s.name,
    mapId: s.mapId,
    sides: s.sides.map((side) => ({
      name: side.name,
      colour: side.colour,
      addDefId: "",
      units: side.units.map((u) => ({
        definitionId: u.definitionId,
        prePlaced: u.x !== undefined,
        x: u.x !== undefined ? String(u.x) : "",
        y: u.y !== undefined ? String(u.y) : "",
      })),
    })),
  };
}

function formToScenarioData(form: ScenarioForm): Omit<Scenario, "id"> {
  return {
    name: form.name.trim() || "Unnamed Scenario",
    mapId: form.mapId as MapId,
    sides: form.sides.map(
      (side, i): ScenarioSideSetup => ({
        id: i as SideId,
        name: side.name.trim() || `Side ${i + 1}`,
        colour: side.colour,
        units: side.units.map((u) => ({
          definitionId: u.definitionId,
          ...(u.prePlaced && u.x !== "" && u.y !== ""
            ? {
                x: Math.max(0, parseInt(u.x, 10) || 0) as Cells,
                y: Math.max(0, parseInt(u.y, 10) || 0) as Cells,
              }
            : {}),
        })),
      }),
    ),
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
  return updateSide(sides, si, {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    units: sides[si]!.units.map((u, idx) =>
      idx === ui ? { ...u, ...patch } : u,
    ),
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
}

export function ScenarioManager({ onClose }: Props) {
  const dispatch = useAppDispatch();
  const scenarios = useSelector(selectAllScenarios);
  const maps = useSelector(selectAllMaps);
  const definitions = useSelector(selectAllDefinitions);
  const battle = useSelector(selectBattle);

  const [form, setForm] = useState<ScenarioForm | null>(null);
  const [editingId, setEditingId] = useState<ScenarioId | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const mapName = (id: string) =>
    maps.find((m) => m.id === id)?.name ?? id ?? "—";

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

  function handleExport(s: Scenario) {
    const json = JSON.stringify(s, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportAll() {
    const json = JSON.stringify(scenarios, null, 2);
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
        const raw = JSON.parse(ev.target?.result as string);
        // Accept either a single scenario or an array
        const list: Scenario[] = Array.isArray(raw) ? raw : [raw];
        if (!list.length || typeof list[0]!.name !== "string")
          throw new Error("Invalid format");
        dispatch(setAllScenarios(list));
      } catch {
        alert("Invalid scenario JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ---- Editor actions ------------------------------------------------------

  function handleNew() {
    setEditingId(null);
    setForm({ ...blankForm, mapId: maps[0]?.id ?? "" });
  }

  function handleEdit(s: Scenario) {
    setEditingId(s.id);
    setForm(scenarioToForm(s));
  }

  function handleCancelEdit() {
    setForm(null);
    setEditingId(null);
  }

  function handleSave(e: React.FormEvent) {
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
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        sides: updateSide(f.sides, si, {
          units: [
            ...f.sides[si]!.units,
            { definitionId: defId, prePlaced: false, x: "", y: "" },
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

  // ---- Render --------------------------------------------------------------

  // Editor view
  if (form) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-panel scenario-manager-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{editingId ? "Edit Scenario" : "New Scenario"}</h2>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <form
            className="scenario-form"
            id={formId}
            onSubmit={handleSave}
          >
            {/* Name + map */}
            <div className="scenario-form-row">
              <label className="scenario-label-wide">
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, name: e.target.value })
                  }
                  placeholder="Scenario name"
                />
              </label>
              <label>
                Map
                <select
                  value={form.mapId}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, mapId: e.target.value })
                  }
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

            {/* Sides */}
            <div className="scenario-sides">
              {form.sides.map((side, si) => (
                <div key={si} className="scenario-side">
                  <div className="scenario-side-header">
                    <span className="scenario-side-label">Side {si + 1}</span>
                    <input
                      type="text"
                      className="scenario-side-name"
                      value={side.name}
                      onChange={(e) =>
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              sides: updateSide(f.sides, si, {
                                name: e.target.value,
                              }),
                            },
                        )
                      }
                    />
                    <input
                      type="color"
                      value={side.colour}
                      onChange={(e) =>
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              sides: updateSide(f.sides, si, {
                                colour: e.target.value,
                              }),
                            },
                        )
                      }
                      title="Side colour"
                    />
                    {form.sides.length > 2 && (
                      <button
                        type="button"
                        className="scenario-remove-btn"
                        onClick={() => removeSide(si)}
                        title="Remove side"
                      >
                        ×
                      </button>
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
                      return (
                        <div key={ui} className="scenario-unit-row">
                          <span className="scenario-unit-name">
                            {def?.name ?? u.definitionId}
                          </span>
                          <label className="scenario-preplaced-label">
                            <input
                              type="checkbox"
                              checked={u.prePlaced}
                              onChange={(e) =>
                                setForm(
                                  (f) =>
                                    f && {
                                      ...f,
                                      sides: updateUnit(
                                        f.sides,
                                        si,
                                        ui,
                                        { prePlaced: e.target.checked },
                                      ),
                                    },
                                )
                              }
                            />
                            pre-placed
                          </label>
                          {u.prePlaced && (
                            <>
                              <label className="scenario-coord-label">
                                x
                                <input
                                  type="number"
                                  min={0}
                                  className="scenario-coord-input"
                                  value={u.x}
                                  onChange={(e) =>
                                    setForm(
                                      (f) =>
                                        f && {
                                          ...f,
                                          sides: updateUnit(
                                            f.sides,
                                            si,
                                            ui,
                                            { x: e.target.value },
                                          ),
                                        },
                                    )
                                  }
                                />
                              </label>
                              <label className="scenario-coord-label">
                                y
                                <input
                                  type="number"
                                  min={0}
                                  className="scenario-coord-input"
                                  value={u.y}
                                  onChange={(e) =>
                                    setForm(
                                      (f) =>
                                        f && {
                                          ...f,
                                          sides: updateUnit(
                                            f.sides,
                                            si,
                                            ui,
                                            { y: e.target.value },
                                          ),
                                        },
                                    )
                                  }
                                />
                              </label>
                            </>
                          )}
                          <button
                            type="button"
                            className="scenario-remove-btn"
                            onClick={() => removeUnit(si, ui)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add unit row */}
                  <div className="scenario-add-unit-row">
                    <select
                      value={side.addDefId}
                      onChange={(e) =>
                        setForm(
                          (f) =>
                            f && {
                              ...f,
                              sides: updateSide(f.sides, si, {
                                addDefId: e.target.value,
                              }),
                            },
                        )
                      }
                    >
                      <option value="">— add unit from roster —</option>
                      {definitions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.type.name})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!side.addDefId}
                      onClick={() => addUnit(si)}
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

            <div className="scenario-form-footer">
              <button type="submit" disabled={!form.mapId}>
                {editingId ? "Save changes" : "Create scenario"}
              </button>
              <button type="button" onClick={handleCancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel scenario-manager-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Scenarios</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

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
              (n, side) => n + side.units.filter((u) => u.x !== undefined).length,
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
                      </span>
                    ))}
                  </span>
                </div>
                <div className="scenario-item-actions">
                  <button onClick={() => handleLoad(s)}>Load</button>
                  <button onClick={() => handleEdit(s)}>Edit</button>
                  <button onClick={() => handleExport(s)}>Export</button>
                  <button onClick={() => handleDelete(s.id)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="map-manager-footer">
          <button onClick={handleNew}>+ New Scenario</button>
          <button
            onClick={handleExportAll}
            disabled={scenarios.length === 0}
          >
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
    </div>
  );
}
