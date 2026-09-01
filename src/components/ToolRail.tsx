'use client'

import {
  ArrowUpRight,
  Copy,
  DraftingCompass,
  Eraser,
  Frame,
  Grid2X2,
  Group,
  Hand,
  Highlighter,
  Image as ImageIcon,
  LineChart,
  MousePointer2,
  Pencil,
  Redo2,
  Sigma,
  Square,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

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

const creationTools: Array<{ mode: ToolMode; label: string; icon: LucideIcon; shortcut?: string }> = [
  { mode: 'select', label: 'Select', icon: MousePointer2, shortcut: 'V' },
  { mode: 'hand', label: 'Pan', icon: Hand, shortcut: 'H' },
  { mode: 'pen', label: 'Pen', icon: Pencil, shortcut: 'P' },
  { mode: 'highlighter', label: 'Highlighter', icon: Highlighter },
  { mode: 'eraser', label: 'Eraser', icon: Eraser, shortcut: 'E' },
  { mode: 'text', label: 'Text', icon: Type, shortcut: 'T' },
  { mode: 'equation', label: 'Equation', icon: Sigma, shortcut: 'M' },
  { mode: 'graph', label: 'Graph', icon: LineChart, shortcut: 'G' },
  { mode: 'geometry', label: 'Geometry', icon: DraftingCompass, shortcut: 'C' },
  { mode: 'matrix', label: 'Matrix', icon: Grid2X2, shortcut: 'X' },
  { mode: 'image', label: 'Image', icon: ImageIcon },
  { mode: 'shape', label: 'Shape', icon: Square, shortcut: 'S' },
  { mode: 'arrow', label: 'Arrow', icon: ArrowUpRight, shortcut: 'A' },
  { mode: 'frame', label: 'Frame', icon: Frame, shortcut: 'F' },
]

function RailButton({
  label,
  icon: Icon,
  active,
  shortcut,
  onClick,
}: {
  label: string
  icon: LucideIcon
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
      <Icon className="rail-glyph" aria-hidden="true" strokeWidth={1.75} />
      <span className="rail-tooltip">{label}{shortcut ? <kbd>{shortcut}</kbd> : null}</span>
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
      <div className="rail-tools">
        {creationTools.map((tool) => (
          <RailButton
            key={tool.mode}
            label={tool.label}
            icon={tool.icon}
            shortcut={tool.shortcut}
            active={mode === tool.mode}
            onClick={() => onMode(tool.mode)}
          />
        ))}
      </div>
      <div className="rail-divider" />
      <div className="rail-tools rail-actions">
        <RailButton label="Undo" icon={Undo2} shortcut="Ctrl Z" onClick={onUndo} />
        <RailButton label="Redo" icon={Redo2} shortcut="Ctrl Shift Z" onClick={onRedo} />
        <RailButton label="Group" icon={Group} shortcut="Ctrl G" onClick={onGroup} />
        <RailButton label="Duplicate" icon={Copy} shortcut="Ctrl D" onClick={onDuplicate} />
        <RailButton label="Delete" icon={Trash2} shortcut="Del" onClick={onDelete} />
      </div>
    </aside>
  )
}
