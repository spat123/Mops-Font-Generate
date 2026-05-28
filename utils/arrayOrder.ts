export function moveItemById<T extends { id?: string }>(
  list: T[] | null | undefined,
  draggedId: string,
  targetId: string,
): T[] {
  const items = Array.isArray(list) ? [...list] : [];
  const fromIndex = items.findIndex((item) => item?.id === draggedId);
  const targetIndex = items.findIndex((item) => item?.id === targetId);

  if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) {
    return items;
  }

  const [movedItem] = items.splice(fromIndex, 1);
  items.splice(targetIndex, 0, movedItem);
  return items;
}

export function orderItemsByIdList<T extends { id?: string }>(
  list: T[] | null | undefined,
  orderedIds: string[] | null | undefined,
): T[] {
  const items = Array.isArray(list) ? list : [];
  const idOrder = Array.isArray(orderedIds) ? orderedIds : [];
  if (items.length === 0 || idOrder.length === 0) return items;

  const rank = new Map(idOrder.map((id, index) => [id, index]));

  return [...items].sort((a, b) => {
    const aRank = rank.has(a?.id || '') ? rank.get(a?.id || '')! : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b?.id || '') ? rank.get(b?.id || '')! : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return 0;
  });
}

export function areIdOrdersEqual<T extends { id?: string }>(
  list: T[] | null | undefined,
  ids: string[] | null | undefined,
): boolean {
  if (!Array.isArray(list) || !Array.isArray(ids) || list.length !== ids.length) return false;
  return list.every((item, index) => item?.id === ids[index]);
}
