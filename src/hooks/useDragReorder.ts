import { useCallback, useRef } from "react";

export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const dragIndex = useRef<number | null>(null);

  const getDragProps = useCallback(
    (index: number) => ({
      draggable: true,
      onDragStart: () => {
        dragIndex.current = index;
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex.current !== null && dragIndex.current !== index) {
          onReorder(dragIndex.current, index);
        }
        dragIndex.current = null;
      },
      onDragEnd: () => {
        dragIndex.current = null;
      },
    }),
    [onReorder],
  );

  return getDragProps;
}
