import { useSelector } from "react-redux";

import type { Cells } from "../flavours.js";
import {
  selectLogMessages,
  selectTerrainEntities,
} from "../state/selectors.js";
import { classnames } from "../tools.js";

interface MessageLogProps {
  panToCell: (x: Cells, y: Cells) => void;
}

export function MessageLog({ panToCell }: MessageLogProps) {
  const log = useSelector(selectLogMessages);
  const terrain = useSelector(selectTerrainEntities);

  return (
    <div className="message-log">
      {log.toReversed().map((msg, i) => {
        const cell = msg.focus ? terrain[msg.focus] : undefined;
        return (
          <div
            key={i}
            className={classnames("log-entry", { clickable: !!cell })}
            onClick={() => {
              if (cell) panToCell(cell.x, cell.y);
            }}
          >
            {msg.text}
          </div>
        );
      })}
    </div>
  );
}
