import { LayoutDashboard, ClipboardList, Receipt, Tag, BarChart3, Boxes, Settings, Building2, FileBarChart, Search, Egg, Droplets, Wheat, Package, Lightbulb } from 'lucide-react';
export const UNIT_TYPES = [
  { value: 'eggs', label: 'Layer flock (eggs)', unitLabel: 'eggs', groupSize: 30, groupLabel: 'tray', hasGrades: true, icon: Egg },
  { value: 'milk', label: 'Dairy herd (milk)', unitLabel: 'liters', groupSize: 1, groupLabel: 'liter', hasGrades: false, icon: Droplets },
  { value: 'crop', label: 'Crop plot (produce)', unitLabel: 'kg', groupSize: 1, groupLabel: 'kg', hasGrades: false, icon: Wheat },
  { value: 'other', label: 'Other livestock/produce', unitLabel: 'units', groupSize: 1, groupLabel: 'unit', hasGrades: false, icon: Package },
];
export const EXPENSE_CATEGORIES = [{ value: 'feed', label: 'Feed' }, { value: 'medicine', label: 'Medicine / vaccines' }, { value: 'labor', label: 'Labor' }, { value: 'utilities', label: 'Utilities' }, { value: 'supplies', label: 'Supplies' }, { value: 'capital', label: 'Capital / equipment' }];
export const PERIODS = [{ value: 'today', label: 'Today' }, { value: 'week', label: 'Last 7 days' }, { value: 'month', label: 'This month' }, { value: 'all', label: 'All time' }];
export const PAYMENT_METHODS = [{ value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' }, { value: 'bank', label: 'Bank' }, { value: 'credit', label: 'On credit' }];
export const TABS = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { value: 'log', label: 'Daily log', icon: ClipboardList }, { value: 'expenses', label: 'Expenses', icon: Receipt }, { value: 'inventory', label: 'Stock', icon: Boxes }, { value: 'units', label: 'Groups', icon: Tag }, { value: 'suppliers', label: 'Suppliers', icon: Building2 }, { value: 'analytics', label: 'Analytics', icon: BarChart3 }, { value: 'insights', label: 'Farm insights', icon: Lightbulb }, { value: 'reports', label: 'Reports', icon: FileBarChart }, { value: 'search', label: 'Search', icon: Search }, { value: 'settings', label: 'Settings', icon: Settings },
];
