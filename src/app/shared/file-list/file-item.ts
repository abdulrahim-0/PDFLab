export interface FileItem {
  id: string;
  file: File;
}

let nextId = 1;

export function toFileItems(files: readonly File[]): FileItem[] {
  return files.map((file) => ({ id: `file-${nextId++}`, file }));
}

export interface ReorderEvent {
  from: number;
  to: number;
}

export function moveItem<T>(items: readonly T[], { from, to }: ReorderEvent): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
