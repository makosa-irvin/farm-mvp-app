// Production-unit actions. Deleting a unit also removes its daily logs and
// unit-owned ledger transactions, while unit references on expenses are
// cleared rather than deleting the expense itself.

export function createUnitActions({ units, setUnits, setLogs, setExpenses, setInventoryTransactions, showToast, confirm }) {
  const addUnit = (unit) => {
    setUnits((prev) => [...prev, unit]);
    showToast(`${unit.name} added — ready to log production.`);
  };

  const updateUnit = (unit) => {
    setUnits((prev) => prev.map((x) => (x.id === unit.id ? unit : x)));
    showToast(`${unit.name} updated.`);
  };

  const removeUnit = async (id) => {
    const unit = units.find((u) => u.id === id);
    if (!(await confirm(`Remove ${unit?.name || 'this unit'}? Its daily records will be removed too.`))) return;
    setUnits((prev) => prev.filter((u) => u.id !== id));
    setLogs((prev) => prev.filter((l) => l.unitId !== id));
    setExpenses((prev) => prev.map((e) => (e.unitId === id ? { ...e, unitId: null } : e)));
    setInventoryTransactions((prev) => prev.filter((t) => t.unitId !== id && t.sourceUnitId !== id && t.destinationUnitId !== id));
    showToast('Unit removed.');
  };

  return { addUnit, updateUnit, removeUnit };
}
