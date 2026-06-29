import { useMemo } from "react";

interface SeatPickerProps {
  occupied: string[];
  selected: string[];
  onToggle: (seat: string) => void;
  maxRows?: number;
  maxCols?: number;
}

export default function SeatPicker({
  occupied,
  selected,
  onToggle,
  maxRows = 10,
  maxCols = 10,
}: SeatPickerProps) {
  const rows = useMemo(
    () => Array.from({ length: maxRows }, (_, i) => String.fromCharCode(65 + i)),
    [maxRows]
  );

  const cols = useMemo(
    () => Array.from({ length: maxCols }, (_, i) => i + 1),
    [maxCols]
  );

  const getLabel = (row: string, col: number) => `${row}${col}`;

  const getSeatClass = (label: string): string => {
    if (occupied.includes(label)) return "seat occupied";
    if (selected.includes(label)) return "seat selected";
    return "seat available";
  };

  return (
    <div className="seat-picker">
      <div className="screen-indicator">
        <div className="screen-text">PANTALLA</div>
      </div>

      <div className="seat-grid">
        {rows.map((row) => (
          <div key={row} className="seat-row">
            <span className="row-label">{row}</span>
            {cols.map((col) => {
              const label = getLabel(row, col);
              return (
                <div
                  key={label}
                  className={getSeatClass(label)}
                  title={label}
                  onClick={() => {
                    if (!occupied.includes(label)) {
                      onToggle(label);
                    }
                  }}
                >
                  {col}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="seat-legend">
        <div className="legend-item">
          <div className="seat available legend-seat"></div>
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <div className="seat selected legend-seat"></div>
          <span>Seleccionado</span>
        </div>
        <div className="legend-item">
          <div className="seat occupied legend-seat"></div>
          <span>Ocupado</span>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="selected-seats-info">
          <strong>Asientos seleccionados:</strong> {selected.join(", ")}
        </div>
      )}
    </div>
  );
}
