export type ToolMode =
  | 'select'
  | 'hand'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'text'
  | 'equation'
  | 'image'
  | 'shape'
  | 'arrow'
  | 'frame'
  | 'graph'
  | 'geometry'
  | 'matrix'

type ToolRailProps = {
  mode: ToolMode
  onMode: (mode: ToolMode) => void
  onUndo: () => void
  onRedo: () => void
  onGroup: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const creationTools: Array<{ mode: ToolMode; label: string; glyph: string; shortcut?: string }> = [
  { mode: 'select', label: 'Select', glyph: '↖', shortcut: 'V' },
  { mode: 'hand', label: 'Hand', glyph: '✦', shortcut: 'H' },
  { mode: 'pen', label: 'Pen', glyph: '╱', shortcut: 'P' },
  { mode: 'highlighter', label: 'Highlight', glyph: '▰' },
  { mode: 'eraser', label: 'Eraser', glyph: '◇', shortcut: 'E' },
  { mode: 'text', label: 'Text', glyph: 'T', shortcut: 'T' },
  { mode: 'equation', label: 'Math', glyph: '∫', shortcut: 'M' },
  { mode: 'graph', label: 'Graph', glyph: 'ƒ', shortcut: 'G' },
  { mode: 'geometry', label: 'Construct', glyph: '△', shortcut: 'C' },
  { mode: 'matrix', label: 'Matrix', glyph: '▦', shortcut: 'X' },
  { mode: 'image', label: 'Image', glyph: '▧' },
  { mode: 'shape', label: 'Shape', glyph: '○', shortcut: 'S' },
  { mode: 'arrow', label: 'Arrow', glyph: '↗', shortcut: 'A' },
  { mode: 'frame', label: 'Frame', glyph: '⌗', shortcut: 'F' },
]

function RailButton({
  label,
  glyph,
  active,
  shortcut,
  onClick,
}: {
  label: string
  glyph: string
  active?: boolean
  shortcut?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`rail-button${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      onClick={onClick}
    >
      <span className="rail-glyph" aria-hidden="true">{glyph}</span>
      <span className="rail-tooltip">{label}</span>
    </button>
  )
}

export default function ToolRail({
  mode,
  onMode,
  onUndo,
  onRedo,
  onGroup,
  onDuplicate,
  onDelete,
}: ToolRailProps) {
  return (
    <aside className="tool-rail" aria-label="Whiteboard tools">
      <div className="rail-mark" aria-hidden="true">M</div>
      <div className="rail-tools">
        {creationTools.map((tool) => (
          <RailButton
            key={tool.mode}
            label={tool.label}
            glyph={tool.glyph}
            shortcut={tool.shortcut}
            active={mode === tool.mode}
            onClick={() => onMode(tool.mode)}
          />
        ))}
      </div>
      <div className="rail-divider" />
      <div className="rail-tools rail-actions">
        <RailButton label="Undo" glyph="↶" shortcut="Ctrl Z" onClick={onUndo} />
        <RailButton label="Redo" glyph="↷" shortcut="Ctrl Shift Z" onClick={onRedo} />
        <RailButton label="Group" glyph="⌘" shortcut="Ctrl G" onClick={onGroup} />
        <RailButton label="Duplicate" glyph="⧉" shortcut="Ctrl D" onClick={onDuplicate} />
        <RailButton label="Delete" glyph="×" shortcut="Del" onClick={onDelete} />
      </div>
    </aside>
  )
}
