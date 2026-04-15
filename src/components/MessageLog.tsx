import { useSelector } from "react-redux";

import type { Cells } from "../flavours.js";
import { selectLogMessages, selectMap } from "../state/selectors.js";
import { classnames } from "../tools.js";

interface MessageLogProps {
  panToCell: (x: Cells, y: Cells) => void;
  onHoverCell?: (x: Cells, y: Cells) => void;
  onUnhoverCell?: () => void;
}

export function MessageLog({ panToCell, onHoverCell, onUnhoverCell }: MessageLogProps) {
  const log = useSelector(selectLogMessages);
  const map = useSelector(selectMap);

  return (
    <div className="message-log">
      {log.toReversed().map((msg, i) => {
        const cell = msg.focus ? map?.cells.entities[msg.focus] : undefined;
        return (
          <div
            key={i}
            className={classnames("log-entry", { clickable: !!cell })}
            onClick={() => {
              if (cell) panToCell(cell.x, cell.y);
            }}
            onMouseEnter={() => {
              if (cell) onHoverCell?.(cell.x, cell.y);
            }}
            onMouseLeave={() => {
              if (cell) onUnhoverCell?.();
            }}
          >
            {msg.text}
          </div>
        );
      })}
    </div>
  );
}
