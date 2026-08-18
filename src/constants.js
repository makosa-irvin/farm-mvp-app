import {
  LayoutDashboard, ClipboardList, Receipt, Tag, BarChart3, Boxes,
  Egg, Droplets, Wheat, Package,
} from 'lucide-react';

// The kinds of production a unit (flock, herd, plot) can track.
// - groupSize/groupLabel: the natural "selling unit" for cost display,
//   e.g. eggs are sold by the dozen, so costPerUnit * 12 = cost per dozen.
// - hasGrades: eggs are logged by size grade (large/medium/small); other
//   types just log a single quantity. See DailyLogView for where this
//   branches the form.
export const UNIT_TYPES = [
  { value: 'eggs', label: 'Layer flock (eggs)', unitLabel: 'eggs', groupSize: 12, groupLabel: 'dozen', hasGrades: true, icon: Egg },
  { value: 'milk', label: 'Dairy herd (milk)', unitLabel: 'liters', groupSize: 1, groupLabel: 'liter', hasGrades: false, icon: Droplets },
  { value: 'crop', label: 'Crop plot (produce)', unitLabel: 'kg', groupSize: 1, groupLabel: 'kg', hasGrades: false, icon: Wheat },
  { value: 'other', label: 'Other livestock/produce', unitLabel: 'units', groupSize: 1, groupLabel: 'unit', hasGrades: false, icon: Package },
];

// Cost categories for manually recorded expenses (ExpensesView). Any of
// these can optionally be linked to an inventory item + quantity, which
// turns the expense into a stock purchase — see src/lib/expenseLinking.js.
export const EXPENSE_CATEGORIES = [
  { value: 'feed', label: 'Feed' },
  { value: 'medicine', label: 'Medicine / vaccines' },
  { value: 'labor', label: 'Labor' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'capital', label: 'Capital / equipment' },
];

// Date-range filter options used on the Analytics view.
export const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

// Top-level navigation, in display order. App.jsx renders one button per
// entry and swaps the visible view based on `value`.
export const TABS = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'log', label: 'Daily log', icon: ClipboardList },
  { value: 'expenses', label: 'Expenses', icon: Receipt },
  { value: 'inventory', label: 'Stock', icon: Boxes },
  { value: 'units', label: 'Units', icon: Tag },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
];
