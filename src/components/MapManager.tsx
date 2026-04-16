import { useId, useRef, useState } from "react";
import { useSelector } from "react-redux";

import type { Cells, Feet, MapId } from "../flavours.js";
import { Phase } from "../killchain/rules.js";
import { generateGridMap } from "../sampleData.js";
import { setMap } from "../state/battle.js";
import { addMap, deleteMap, type MapEntity } from "../state/maps.js";
import { selectAllMaps, selectBattle, selectMap } from "../state/selectors.js";
import { useAppDispatch } from "../state/store.js";

interface Props {
  onClose: () => void;
}

interface NewMapForm {
  name: string;
  width: string;
  height: string;
  cellSize: string;
  seed: string;
  useSeed: boolean;
}

const defaultForm: NewMapForm = {
  name: "New Map",
  width: "20",
  height: "20",
  cellSize: "10",
  seed: "",
  useSeed: false,
};

function mapDisplayName(map: MapEntity) {
  return map.name ?? map.id;
}

export function MapManager({ onClose }: Props) {
  const dispatch = useAppDispatch();
  const maps = useSelector(selectAllMaps);
  const activeMap = useSelector(selectMap);
  const battle = useSelector(selectBattle);
  const [form, setForm] = useState(defaultForm);
  const [showCreate, setShowCreate] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const canActivate = battle.phase === Phase.Placement;

  function handleActivate(mapId: MapId) {
    dispatch(setMap(mapId));
    onClose();
  }

  function handleDelete(mapId: MapId) {
    if (mapId === activeMap?.id) return; // don't delete active map
    dispatch(deleteMap(mapId));
  }

  function handleExport(map: MapEntity) {
    const json = JSON.stringify(map, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mapDisplayName(map).replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as MapEntity;
        const newId = String(Date.now()) as MapId;
        dispatch(addMap({ ...raw, id: newId }));
      } catch {
        alert("Invalid map JSON.");
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  }

  function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    const width = Math.max(4, Math.min(60, parseInt(form.width, 10) || 20));
    const height = Math.max(4, Math.min(60, parseInt(form.height, 10) || 20));
    const cellSize = (parseInt(form.cellSize, 10) || 10) as Feet;
    const seed =
      form.useSeed && form.seed ? parseInt(form.seed, 10) : undefined;
    const id = String(Date.now()) as MapId;
    const map = generateGridMap(
      id,
      cellSize,
      width as Cells,
      height as Cells,
      seed,
      form.name || "New Map",
    );
    dispatch(addMap(map));
    setForm(defaultForm);
    setShowCreate(false);
  }

  return (
    <div className="manager-page">
      <div className="manager-header">
        <button className="back-btn" onClick={onClose}>
          ← Back
        </button>
        <h2>Map Manager</h2>
      </div>
      <div className="manager-body">
        <div className="manager-body-inner map-manager-inner">
          {!canActivate && (
            <p className="map-manager-warning">
              Maps can only be switched during Placement phase.
            </p>
          )}

          <div className="map-list">
            {maps.map((map) => (
              <div
                key={map.id}
                className={`map-item${map.id === activeMap?.id ? " active" : ""}`}
              >
                <div className="map-item-info">
                  <span className="map-item-name">{mapDisplayName(map)}</span>
                  <span className="map-item-dims">
                    {map.width}×{map.height}, {map.cellSize}ft cells
                  </span>
                </div>
                <div className="map-item-actions">
                  <button
                    disabled={!canActivate || map.id === activeMap?.id}
                    onClick={() => {
                      handleActivate(map.id);
                    }}
                  >
                    {map.id === activeMap?.id ? "Active" : "Use"}
                  </button>
                  <button
                    onClick={() => {
                      handleExport(map);
                    }}
                  >
                    Export
                  </button>
                  <button
                    disabled={map.id === activeMap?.id}
                    onClick={() => {
                      handleDelete(map.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="map-manager-footer">
            <button
              onClick={() => {
                setShowCreate((v) => !v);
              }}
            >
              {showCreate ? "Cancel" : "+ New Map"}
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
              className="map-create-form"
              id={formId}
              onSubmit={handleCreate}
            >
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                  }}
                />
              </label>
              <div className="form-row">
                <label>
                  Width
                  <input
                    type="number"
                    min={4}
                    max={60}
                    value={form.width}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, width: e.target.value }));
                    }}
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    min={4}
                    max={60}
                    value={form.height}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, height: e.target.value }));
                    }}
                  />
                </label>
              </div>
              <label>
                Cell size (ft)
                <select
                  value={form.cellSize}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, cellSize: e.target.value }));
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                </select>
              </label>
              <label className="seed-row">
                <input
                  type="checkbox"
                  checked={form.useSeed}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, useSeed: e.target.checked }));
                  }}
                />
                Use seed
                <input
                  type="number"
                  disabled={!form.useSeed}
                  value={form.seed}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, seed: e.target.value }));
                  }}
                  placeholder="random"
                />
              </label>
              <button type="submit">Create</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
