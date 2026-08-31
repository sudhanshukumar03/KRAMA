# -*- coding: utf-8 -*-
import codecs

filepath = 'apps/web/src/components/planner/PlannerMatrix.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

new_component = """
function DroppableTimeBlock({ block, onClickTimeBlock }: { block: any, onClickTimeBlock?: (block: any) => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeblock-${block.id}`,
    data: { type: 'TimeBlock', block }
  });

  return (
    <button
      ref={setNodeRef}
      key={block.id}
      onClick={() => onClickTimeBlock && onClickTimeBlock(block)}
      className={`w-full text-left rounded-lg p-2 border-l-4 border-t border-r border-b shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 ${BLOCK_COLORS[block.type] || BLOCK_COLORS.OTHER} ${BLOCK_ACCENTS[block.type] || BLOCK_ACCENTS.OTHER} ${isOver ? 'ring-2 ring-blue-500 scale-[1.02]' : ''}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[9px] font-black tracking-tight opacity-80">
          {safeTimeFormat(block.startTime)} - {safeTimeFormat(block.endTime)}
        </span>
        <MoreVertical size={10} className="opacity-50" />
      </div>
      <div className="text-[10px] font-bold leading-tight line-clamp-2">
        {block.title}
      </div>
      <div className="text-[8px] font-bold uppercase tracking-wider opacity-60">
        {block.type}
      </div>
      {block.taskId && (
        <div className="mt-1 bg-white/60 dark:bg-slate-900/40 rounded px-1.5 py-0.5 text-[8.5px] font-medium truncate flex items-center gap-1">
          <CheckCircle2 size={8} className="text-blue-500" />
          {block.task?.title || "Linked Task"}
        </div>
      )}
    </button>
  );
}
"""

# Insert the component before export function PlannerMatrix
content = content.replace("export function PlannerMatrix({", new_component + "\nexport function PlannerMatrix({")

# Replace the mapping
old_mapping = """                        {dayBlocks.map((block) => (
                          <button
                            key={block.id}
                            onClick={() => onClickTimeBlock && onClickTimeBlock(block)}
                            className={`w-full text-left rounded-lg p-2 border-l-4 border-t border-r border-b shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-1 ${BLOCK_COLORS[block.type] || BLOCK_COLORS.OTHER} ${BLOCK_ACCENTS[block.type] || BLOCK_ACCENTS.OTHER}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[9px] font-black tracking-tight opacity-80">
                                {safeTimeFormat(block.startTime)} - {safeTimeFormat(block.endTime)}
                              </span>
                              <MoreVertical size={10} className="opacity-50" />
                            </div>
                            <div className="text-[10px] font-bold leading-tight line-clamp-2">
                              {block.title}
                            </div>
                            <div className="text-[8px] font-bold uppercase tracking-wider opacity-60">
                              {block.type}
                            </div>
                          </button>
                        ))}"""

new_mapping = """                        {dayBlocks.map((block) => (
                          <DroppableTimeBlock key={block.id} block={block} onClickTimeBlock={onClickTimeBlock} />
                        ))}"""

content = content.replace(old_mapping, new_mapping)

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
