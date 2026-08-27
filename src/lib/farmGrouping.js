export function memberIdsFor(units = [], unitId = 'all') {
  if (unitId === 'all') return units.map((u) => u.id);
  const selected = units.find((u) => u.id === unitId);
  if (!selected) return [unitId];
  const children = units.filter((u) => u.parentGroupId === selected.id).map((u) => u.id);
  return children.length ? [selected.id, ...children] : [selected.id];
}

export function childrenOf(units = [], parentId) {
  return units.filter((u) => u.parentGroupId === parentId);
}

export function isParentGroup(units = [], unit) {
  return childrenOf(units, unit.id).length > 0;
}
