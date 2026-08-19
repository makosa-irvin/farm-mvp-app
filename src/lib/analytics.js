import { isInventoryCostDeduction, inventoryTransactionCost } from './inventoryLedger.js';

const asDate = value => new Date(`${value}T00:00:00`);
const num = value => Number(value) || 0;

export function filterAnalyticsData({ units = [], logs = [], expenses = [], inventory = [], inventoryMoves = [] }, filters = {}) {
  const start = filters.startDate ? asDate(filters.startDate) : null; const end = filters.endDate ? asDate(filters.endDate) : null;
  const unitId = filters.unitId || 'all'; const itemId = filters.itemId || 'all'; const expenseType = filters.expenseType || 'all';
  const inRange = date => { if (!date) return false; const d = asDate(date); return (!start || d >= start) && (!end || d <= end); };
  return {
    units: units.filter(u => unitId === 'all' || u.id === unitId),
    logs: logs.filter(l => inRange(l.date) && (unitId === 'all' || l.unitId === unitId)),
    expenses: expenses.filter(e => inRange(e.date) && (unitId === 'all' || e.unitId === unitId) && (expenseType === 'all' || (e.category || e.expenseType || 'other') === expenseType)),
    inventory: inventory.filter(i => itemId === 'all' || i.id === itemId),
    inventoryMoves: inventoryMoves.filter(m => inRange(m.date) && (unitId === 'all' || m.unitId === unitId) && (itemId === 'all' || m.itemId === itemId)),
  };
}

export function availableYears(data) {
  const dates = [...data.logs, ...data.expenses, ...data.inventoryMoves].map(x => x.date).filter(Boolean);
  return [...new Set(dates.map(d => asDate(d).getFullYear()))].sort((a,b) => b-a);
}

function groupByMonth(rows, value) {
  const map = new Map(); rows.forEach(row => { const key = row.date.slice(0, 7); map.set(key, (map.get(key) || 0) + value(row)); });
  return [...map.entries()].sort().map(([month, value]) => ({ month, value }));
}

export function buildFeedAnalysis(data, filters = {}) {
  const d = filterAnalyticsData(data, filters); const feedIds = new Set(d.inventory.filter(i => String(i.category || '').toLowerCase() === 'feed').map(i => i.id)); const moves = d.inventoryMoves.filter(m => feedIds.has(m.itemId));
  const consumption = moves.filter(m => m.transactionType === 'consumption' && (m.direction || m.type) === 'out'); const wastage = moves.filter(m => m.transactionType === 'wastage' && (m.direction || m.type) === 'out'); const purchases = moves.filter(m => m.transactionType === 'purchase' && (m.direction || m.type) === 'in');
  const rows = d.inventory.filter(i => feedIds.has(i.id)).map(item => { const itemMoves=moves.filter(m=>m.itemId===item.id); return { id:item.id, name:item.name, unit:item.unit||'units', consumed:itemMoves.filter(m=>m.transactionType==='consumption').reduce((s,m)=>s+num(m.quantity),0), wastage:itemMoves.filter(m=>m.transactionType==='wastage').reduce((s,m)=>s+num(m.quantity),0), purchased:itemMoves.filter(m=>m.transactionType==='purchase').reduce((s,m)=>s+num(m.quantity),0), cost:itemMoves.filter(isInventoryCostDeduction).reduce((s,m)=>s+inventoryTransactionCost(m),0) }; });
  const feedCost=consumption.reduce((s,m)=>s+inventoryTransactionCost(m),0); const consumed=consumption.reduce((s,m)=>s+num(m.quantity),0); const produced=d.logs.reduce((s,l)=>s+num(l.produced),0); const totalAnimals=d.units.reduce((s,u)=>s+num(u.initialCount),0);
  const animalDays=d.units.reduce((sum,u)=>{ const unitDays=d.logs.filter(l=>l.unitId===u.id).length||1; const mortality=d.logs.filter(l=>l.unitId===u.id).reduce((s,l)=>s+num(l.mortality),0); return sum+Math.max(0,num(u.initialCount)-mortality)*unitDays; },0);
  const monthly=groupByMonth(consumption,m=>num(m.quantity));
  return { rows, consumption:consumed, purchases:purchases.reduce((s,m)=>s+num(m.quantity),0), wastage:wastage.reduce((s,m)=>s+num(m.quantity),0), feedCost, produced, totalAnimals, avgMonthlyConsumption:monthly.length?monthly.reduce((s,r)=>s+r.value,0)/monthly.length:0, consumptionPerAnimal:totalAnimals?consumed/totalAnimals:0, costPerAnimal:totalAnimals?feedCost/totalAnimals:0, feedCostPerAnimalDay:animalDays?feedCost/animalDays:0, feedCostPerProduction:produced?feedCost/produced:0, monthly };
}

export function buildExpenseAnalysis(data, filters = {}) { const d=filterAnalyticsData(data,filters); const byType=new Map(); d.expenses.forEach(e=>{const key=e.category||e.expenseType||'other';byType.set(key,(byType.get(key)||0)+num(e.amount));}); return {total:d.expenses.reduce((s,e)=>s+num(e.amount),0),byType:[...byType.entries()].map(([type,amount])=>({type,amount})).sort((a,b)=>b.amount-a.amount),byMonth:groupByMonth(d.expenses,e=>num(e.amount))}; }
export function buildProductionAnalysis(data, filters = {}) { const d=filterAnalyticsData(data,filters); return {total:d.logs.reduce((s,l)=>s+num(l.produced),0),loss:d.logs.reduce((s,l)=>s+num(l.loss),0),mortality:d.logs.reduce((s,l)=>s+num(l.mortality),0),byMonth:groupByMonth(d.logs,l=>num(l.produced))}; }
export function buildYearOverYear(data, filters = {}) { if(!filters.startDate||!filters.endDate)return null; const start=asDate(filters.startDate),end=asDate(filters.endDate); const priorStart=new Date(start);priorStart.setFullYear(priorStart.getFullYear()-1);const priorEnd=new Date(end);priorEnd.setFullYear(priorEnd.getFullYear()-1);const fmt=d=>d.toISOString().slice(0,10);const current=filterAnalyticsData(data,filters),prior=filterAnalyticsData(data,{...filters,startDate:fmt(priorStart),endDate:fmt(priorEnd)});const sumProduction=rows=>rows.reduce((s,r)=>s+num(r.produced),0),sumExpenses=rows=>rows.reduce((s,r)=>s+num(r.amount),0),pct=(a,b)=>b?((a-b)/Math.abs(b))*100:null;const cp=sumProduction(current.logs),pp=sumProduction(prior.logs),ce=sumExpenses(current.expenses),pe=sumExpenses(prior.expenses);return {current:{production:cp,expenses:ce},prior:{production:pp,expenses:pe},change:{production:pct(cp,pp),expenses:pct(ce,pe)}}; }
export function buildComprehensiveAnalysis(data, filters = {}) { const filtered=filterAnalyticsData(data,filters); const feed=buildFeedAnalysis(filtered),expenses=buildExpenseAnalysis(filtered),production=buildProductionAnalysis(filtered); return {filters,summary:{production:production.total,expenses:expenses.total,feedConsumed:feed.consumption,feedCost:feed.feedCost,wastage:feed.wastage},feed,expenses,production,rows:{logs:filtered.logs,expenses:filtered.expenses,inventoryMoves:filtered.inventoryMoves}}; }

export function downloadComprehensiveAnalysis(data, filters = {}) {
  const report=buildComprehensiveAnalysis(data,filters),stamp=new Date().toISOString().slice(0,10),rows=[];const add=(section,row)=>rows.push({section,...row});
  add('Summary',{metric:'Production',value:report.summary.production});add('Summary',{metric:'Expenses',value:report.summary.expenses});add('Summary',{metric:'Feed consumed',value:report.summary.feedConsumed});add('Summary',{metric:'Feed cost',value:report.summary.feedCost});add('Summary',{metric:'Feed wastage',value:report.summary.wastage});
  report.feed.rows.forEach(r=>add('Feed',{item:r.name,unit:r.unit,consumed:r.consumed,wastage:r.wastage,purchased:r.purchased,cost:r.cost})); report.expenses.byType.forEach(r=>add('Expense type',{type:r.type,amount:r.amount})); report.production.byMonth.forEach(r=>add('Production trend',{month:r.month,produced:r.value}));
  report.rows.logs.forEach(l=>add('Production record',{date:l.date,group:data.units.find(u=>u.id===l.unitId)?.name||'',produced:num(l.produced),feedKg:num(l.feedQuantity??l.feedKg),loss:num(l.loss),mortality:num(l.mortality)}));
  report.rows.expenses.forEach(e=>add('Expense record',{date:e.date,group:data.units.find(u=>u.id===e.unitId)?.name||'',type:e.category||e.expenseType||'',amount:num(e.amount),description:e.description||''}));
  report.rows.inventoryMoves.forEach(m=>add('Stock movement',{date:m.date,item:data.inventory.find(i=>i.id===m.itemId)?.name||'',group:data.units.find(u=>u.id===m.unitId)?.name||'',movement:m.transactionType||'',quantity:num(m.quantity),unitCost:num(m.unitCost),totalCost:num(m.quantity)*num(m.unitCost)}));
  const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];const cell=v=>`"${String(v??'').replaceAll('"','""')}"`;const csv=[headers,...rows.map(r=>headers.map(h=>cell(r[h])))] .map(r=>r.join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mazaosmart-analysis-${stamp}.csv`;a.click();URL.revokeObjectURL(url);return report;
}
