import { useId, useRef, useState } from "react";
import { useSelector } from "react-redux";

import type { SideId, UnitDefinitionId } from "../flavours.js";
import type { Armour, UnitDefinition } from "../killchain/types.js";
import {
  heavyFoot,
  heavyHorse,
  lightFoot,
  lightHorse,
  mediumFoot,
  mediumHorse,
  unarmouredTroops,
} from "../killchain/units.js";
import { deployUnitAction } from "../state/actions.js";
import {
  addDefinition,
  removeDefinition,
  setAllDefinitions,
  updateDefinition,
} from "../state/roster.js";
import {
  selectAllDefinitions,
  selectAllSides,
  selectBattle,
} from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";
import { Phase } from "../killchain/rules.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DefForm {
  name: string;
  shortName: string;
  missile: boolean;
  typeName: string;
  hits: string;
  armour: Armour;
  move: string;
  morale: string;
  mounted: boolean;
  flying: boolean;
  steadfast: boolean;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const unitTypePresets = [
  unarmouredTroops,
  lightFoot,
  mediumFoot,
  heavyFoot,
  lightHorse,
  mediumHorse,
  heavyHorse,
];

const armourOptions: Armour[] = ["Unarmoured", "Light", "Medium", "Heavy"];

const blankForm: DefForm = {
  name: "",
  shortName: "",
  missile: false,
  typeName: "Custom",
  hits: "1",
  armour: "Light",
  move: "120",
  morale: "7",
  mounted: false,
  flying: false,
  steadfast: false,
};

function defToForm(def: UnitDefinition): DefForm {
  return {
    name: def.name,
    shortName: def.shortName ?? "",
    missile: def.missile ?? false,
    typeName: def.type.name,
    hits: String(def.type.hits),
    armour: def.type.armour,
    move: String(def.type.move),
    morale: String(def.type.morale),
    mounted: def.type.mounted ?? false,
    flying: def.type.flying ?? false,
    steadfast: def.type.steadfast ?? false,
  };
}

function formToDefinition(form: DefForm): Omit<UnitDefinition, "id"> {
  return {
    name: form.name.trim() || "Unnamed",
    ...(form.shortName.trim() !== "" && { shortName: form.shortName.trim() }),
    ...(form.missile && { missile: true }),
    type: {
      name: form.typeName.trim() || "Custom",
      hits: Math.max(1, parseInt(form.hits, 10) || 1),
      armour: form.armour,
      move: Math.max(1, parseInt(form.move, 10) || 60),
      morale: Math.max(1, Math.min(11, parseInt(form.morale, 10) || 7)),
      ...(form.mounted && { mounted: true }),
      ...(form.flying && { flying: true }),
      ...(form.steadfast && { steadfast: true }),
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
}

export function RosterManager({ onClose }: Props) {
  const dispatch = useAppDispatch();
  const definitions = useSelector(selectAllDefinitions);
  const sides = useSelector(selectAllSides);
  const battle = useSelector(selectBattle);

  const [form, setForm] = useState<DefForm>(blankForm);
  const [editingId, setEditingId] = useState<UnitDefinitionId | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deployTarget, setDeployTarget] = useState<SideId | "">(
    sides[0]?.id ?? "",
  );
  const importRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const inPlacement = battle.phase === Phase.Placement;

  // ---- Create / Edit -------------------------------------------------------

  function handlePreset(presetName: string) {
    const preset = unitTypePresets.find((p) => p.name === presetName);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      typeName: preset.name,
      hits: String(preset.hits),
      armour: preset.armour,
      move: String(preset.move),
      morale: String(preset.morale),
      mounted: preset.mounted ?? false,
      flying: preset.flying ?? false,
      steadfast: preset.steadfast ?? false,
    }));
  }

  function handleStartEdit(def: UnitDefinition) {
    setEditingId(def.id);
    setForm(defToForm(def));
    setShowCreate(true);
  }

  function handleCancelForm() {
    setShowCreate(false);
    setEditingId(null);
    setForm(blankForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const partial = formToDefinition(form);
    if (editingId) {
      dispatch(updateDefinition({ id: editingId, changes: partial }));
      setEditingId(null);
    } else {
      dispatch(addDefinition(partial));
    }
    setForm(blankForm);
    setShowCreate(false);
  }

  // ---- Delete --------------------------------------------------------------

  function handleDelete(id: UnitDefinitionId) {
    dispatch(removeDefinition(id));
  }

  // ---- Deploy --------------------------------------------------------------

  function handleDeploy(def: UnitDefinition) {
    if (!inPlacement || deployTarget === "") return;
    dispatch(deployUnitAction(def, deployTarget as SideId));
  }

  // ---- Export / Import -----------------------------------------------------

  function handleExportAll() {
    const json = JSON.stringify(definitions, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as UnitDefinition[];
        if (!Array.isArray(raw)) throw new Error("Expected array");
        dispatch(setAllDefinitions(raw));
      } catch {
        alert("Invalid roster JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel roster-manager-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Unit Roster</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {inPlacement && sides.length > 0 && (
          <div className="roster-deploy-bar">
            <span className="palette-label">Deploy to:</span>
            <select
              value={String(deployTarget)}
              onChange={(e) =>
                setDeployTarget(
                  e.target.value === "" ? "" : (Number(e.target.value) as SideId),
                )
              }
            >
              {sides.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="roster-list">
          {definitions.length === 0 && (
            <p className="roster-empty">
              No unit definitions yet. Create one or import a roster.
            </p>
          )}
          {definitions.map((def) => (
            <div key={def.id} className="roster-item">
              <div className="roster-item-info">
                <span className="roster-item-name">{def.name}</span>
                <span className="roster-item-type">
                  {def.type.name} — {def.type.armour}, {def.type.move}ft,
                  morale {def.type.morale}
                  {def.missile ? ", missile" : ""}
                  {def.type.mounted ? ", mounted" : ""}
                  {def.type.flying ? ", flying" : ""}
                  {def.type.steadfast ? ", steadfast" : ""}
                </span>
              </div>
              <div className="roster-item-actions">
                {inPlacement && (
                  <button
                    disabled={deployTarget === ""}
                    onClick={() => handleDeploy(def)}
                  >
                    Deploy
                  </button>
                )}
                <button onClick={() => handleStartEdit(def)}>Edit</button>
                <button onClick={() => handleDelete(def.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="map-manager-footer">
          <button
            onClick={() => {
              if (showCreate && editingId) handleCancelForm();
              else setShowCreate((v) => !v);
            }}
          >
            {showCreate ? "Cancel" : "+ New Unit"}
          </button>
          <button onClick={handleExportAll} disabled={definitions.length === 0}>
            Export JSON
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

        {showCreate && (
          <form
            className="map-create-form roster-form"
            id={formId}
            onSubmit={handleSubmit}
          >
            <label>
              Unit name
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Heralds of Mikius"
              />
            </label>
            <label>
              Short name
              <input
                type="text"
                maxLength={4}
                value={form.shortName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shortName: e.target.value }))
                }
                placeholder="auto"
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.missile}
                onChange={(e) =>
                  setForm((f) => ({ ...f, missile: e.target.checked }))
                }
              />
              Missile weapon
            </label>

            <div className="roster-form-divider">Unit type</div>

            <label>
              Preset
              <select
                value={form.typeName}
                onChange={(e) => handlePreset(e.target.value)}
              >
                <option value="">— pick preset —</option>
                {unitTypePresets.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type name
              <input
                type="text"
                value={form.typeName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, typeName: e.target.value }))
                }
              />
            </label>
            <div className="form-row">
              <label>
                Hits
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.hits}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hits: e.target.value }))
                  }
                />
              </label>
              <label>
                Move (ft)
                <input
                  type="number"
                  min={1}
                  step={30}
                  value={form.move}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, move: e.target.value }))
                  }
                />
              </label>
              <label>
                Morale
                <input
                  type="number"
                  min={1}
                  max={11}
                  value={form.morale}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, morale: e.target.value }))
                  }
                />
              </label>
            </div>
            <label>
              Armour
              <select
                value={form.armour}
                onChange={(e) =>
                  setForm((f) => ({ ...f, armour: e.target.value as Armour }))
                }
              >
                {armourOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.mounted}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mounted: e.target.checked }))
                  }
                />
                Mounted
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.flying}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, flying: e.target.checked }))
                  }
                />
                Flying
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.steadfast}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, steadfast: e.target.checked }))
                  }
                />
                Steadfast
              </label>
            </div>
            <button type="submit">
              {editingId ? "Save changes" : "Add to roster"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
