import { todayISO } from './helpers.js';

export const IMPORT_HEADER_ALIASES = {
  record_type: ['record_type','record type','type','record','entry_type','entry type'],
  date: ['date','day','record_date','record date','date recorded','transaction_date','transaction date','start_date','start date'],
  farm_group: ['farm_group','farm group','farm_group_name','farm group name','group','group_name','group name','unit','unit_name','unit name','flock','herd','plot'],
  name: ['name','item','item_name','item name','description','what','activity','record_name','record name'],
  category: ['category','type/category','expense_category','expense category'],
  unit: ['unit','uom','measure','measurement_unit','measurement unit'],
  quantity: ['quantity','qty','amount_of_stock','amount of stock','count','opening_stock','opening stock','produced','production','production_quantity','production quantity'],
  unit_cost: ['unit_cost','unit cost','cost_per_unit','cost per unit','price_per_unit','price per unit','cost'],
  amount: ['amount','total','total_amount','total amount','expense','expense_amount','expense amount','money','value'],
  supplier: ['supplier','vendor','seller','bought_from','bought from'],
  payment_method: ['payment_method','payment method','paid_by','paid by','payment'],
  movement_type: ['movement_type','movement type','stock_movement','stock movement','transaction_type','transaction type','movement'],
  loss: ['loss','lost','losses','wastage','waste'],
  mortality: ['mortality','deaths','dead','birds_lost','birds lost'],
  notes: ['notes','note','remarks','comment','comments'],
};

export const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
const canonicalHeader = (value) => normalizeHeader(value).replace(/ /g,'_');
export const numberValue = (value) => { const n = Number(String(value ?? '').replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? n : 0; };
const firstValue = (row, keys) => keys.map((k) => row[k]).find((v) => v !== undefined && String(v).trim() !== '') || '';
const textValue = (row, keys) => String(firstValue(row, keys)).trim();

export function mapHeaders(headers) {
  const mapped = {};
  for (const [canonical, aliases] of Object.entries(IMPORT_HEADER_ALIASES)) {
    const index = headers.findIndex((h) => aliases.some((a) => normalizeHeader(a) === normalizeHeader(h)));
    if (index >= 0) mapped[index] = canonical;
  }
  return mapped;
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/,'').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const parseLine = (line) => { const cells=[]; let cell='', quoted=false; for(let i=0;i<line.length;i+=1){const ch=line[i]; if(ch==='"'&&line[i+1]==='"'){cell+='"';i+=1;} else if(ch==='"') quoted=!quoted; else if(ch===','&&!quoted){cells.push(cell.trim());cell='';} else cell+=ch;} cells.push(cell.trim()); return cells; };
  const rawHeaders=parseLine(lines[0]); const mapped=mapHeaders(rawHeaders); const headers=rawHeaders.map((h,i)=>mapped[i]||canonicalHeader(h));
  return lines.slice(1).map((line,index)=>{const cells=parseLine(line);return {...Object.fromEntries(headers.map((h,i)=>[h,cells[i]||''])),_row:index+2};});
}

export function normalizeMovementType(value) {
  const v=String(value||'').trim().toLowerCase().replace(/[- ]+/g,'_');
  return ({bought:'purchase',buy:'purchase',purchased:'purchase',purchase:'purchase',in:'purchase',stock_in:'purchase',used:'consumption',use:'consumption',consumed:'consumption',consumption:'consumption',out:'consumption',stock_out:'consumption',lost:'wastage',waste:'wastage',spoiled:'wastage',spoilage:'wastage',wastage:'wastage',returned:'return',return:'return',found:'adjustment_in',found_extra:'adjustment_in',missing:'adjustment_out',correction_out:'adjustment_out',correction_in:'adjustment_in',counted:'stock_count',stock_count:'stock_count',count:'stock_count',sold:'sale',sale:'sale',transferred:'transfer',transfer:'transfer'})[v] || '';
}

export function inferRecordType(row) {
  const explicit=String(firstValue(row,['record_type','type','record'])).toLowerCase().trim().replace(/[- ]+/g,'_');
  if(['farm_group','farmgroup','group','unit','flock','herd','plot'].includes(explicit)) return 'unit';
  if(['inventory','stock','item','supply'].includes(explicit)) return 'inventory';
  if(['expense','expenses','cost','spending'].includes(explicit)) return 'expense';
  if(['log','daily_log','dailylog','production','activity'].includes(explicit)) return 'log';

  // Infer from the canonical fields produced by parseCsv as well as the
  // original spreadsheet headings. parseCsv maps Produced -> quantity,
  // Losses -> loss, Deaths -> mortality and Expense -> amount, so checking
  // only the original names would miss otherwise valid historical records.
  if(row.movement_type || row.stock_movement || row.transaction_type) return 'inventory';
  if(row.loss || row.mortality || row.produced || row.production || row.production_quantity) return 'log';
  if(row.payment_method || row.paid_by || row.payment || row.supplier || row.vendor || row.expense_amount || row.expense || row.amount || row.total_amount) return 'expense';
  if(row.opening_stock || row.unit_cost || row.cost_per_unit || row.quantity) return 'inventory';
  return '';
}

export function normalizeImportedRow(row) {
  return {...row,record_type:inferRecordType(row),date:textValue(row,['date','record_date','transaction_date','start_date'])||todayISO(),farm_group:textValue(row,['farm_group','farm_group_name','group_name','unit_name','flock','herd','plot']),name:textValue(row,['name','item','item_name','description','what','activity','record_name']),category:textValue(row,['category','expense_category'])||'supplies',unit:textValue(row,['unit','uom','measure'])||'units',quantity:numberValue(firstValue(row,['quantity','qty','count','opening_stock','produced','production','production_quantity'])),unit_cost:numberValue(firstValue(row,['unit_cost','cost_per_unit','price_per_unit','cost'])),amount:numberValue(firstValue(row,['amount','total_amount','total','expense','expense_amount','money','value'])),supplier:textValue(row,['supplier','vendor','seller','bought_from']),payment_method:textValue(row,['payment_method','paid_by','payment']),movement_type:normalizeMovementType(firstValue(row,['movement_type','transaction_type','stock_movement','movement'])),loss:numberValue(firstValue(row,['loss','lost','losses','wastage','waste'])),mortality:numberValue(firstValue(row,['mortality','deaths','dead','birds_lost'])),notes:textValue(row,['notes','note','remarks','comment','comments'])};
}

export function normalizeEntityName(value) { return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' '); }

const GROUP_SYNONYMS = [
  ['dairy','cows','cow','herd','milk'],
  ['layer','layers','chicken','chickens','poultry','eggs','flock'],
];
export function findMatchingUnit(units, importedName) {
  const name=normalizeEntityName(importedName); if(!name) return null;
  const exact=units.find((u)=>normalizeEntityName(u.name)===name); if(exact) return exact;
  const tokens=new Set(name.split(' '));
  const candidates=units.map((u)=>({u,tokens:new Set(normalizeEntityName(u.name).split(' '))})).filter(({tokens:t})=>[...tokens].some((x)=>t.has(x)));
  if(candidates.length===1) return candidates[0].u;
  const synonymMatch=GROUP_SYNONYMS.find((group)=>group.some((x)=>tokens.has(x)));
  if(synonymMatch) { const matches=candidates.filter(({tokens:t})=>synonymMatch.some((x)=>t.has(x))); if(matches.length===1) return matches[0].u; }
  return null;
}
