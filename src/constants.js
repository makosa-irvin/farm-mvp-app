import {
  LayoutDashboard, ClipboardList, Receipt, Tag, BarChart3, Boxes,
  Egg, Droplets, Wheat, Package,
} from 'lucide-react';

// The kinds of farm groups (flocks, herds, plots) the farmer manages.
export const UNIT_TYPES = [
  { value: 'eggs', label: 'Layer flock (eggs)', unitLabel: 'eggs', groupSize: 30, groupLabel: 'tray', hasGrades: true, icon: Egg },
  { value: 'milk', label: 'Dairy herd (milk)', unitLabel: 'liters', groupSize: 1, groupLabel: 'liter', hasGrades: false, icon: Droplets },
  { value: 'crop', label: 'Crop plot (produce)', unitLabel: 'kg', groupSize: 1, groupLabel: 'kg', hasGrades: false, icon: Wheat },
  { value: 'other', label: 'Other livestock/produce', unitLabel: 'units', groupSize: 1, groupLabel: 'unit', hasGrades: false, icon: Package },
];

export const EXPENSE_CATEGORIES = [
  { value: 'feed', label: 'Feed' },
  { value: 'medicine', label: 'Medicine / vaccines' },
  { value: 'labor', label: 'Labor' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'capital', label: 'Capital / equipment' },
];

export const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'On credit' },
];

// "Farm groups" is the user-facing name for the animals, flocks, herds,
// plots, or other productive groups being managed. The stored value remains
// "units" so existing data and business logic are not migrated.
export const TABS = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'log', label: 'Daily log', icon: ClipboardList },
  { value: 'expenses', label: 'Expenses', icon: Receipt },
  { value: 'inventory', label: 'Stock', icon: Boxes },
  { value: 'units', label: 'Groups', icon: Tag },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
];
