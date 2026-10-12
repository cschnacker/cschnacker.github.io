import {validateDatabase,newDatabase} from './model.mjs';
export const STORAGE_KEY='business-finance-planner:database:v1';
export class PlanRepository {
  constructor(storage) { this.storage=storage; this.lastRead=null; }
  load() {
    const raw=this.storage.getItem(STORAGE_KEY);
    this.lastRead=raw;
    return raw===null ? newDatabase() : validateDatabase(JSON.parse(raw));
  }
  save(db) {
    if(this.storage.getItem(STORAGE_KEY)!==this.lastRead) throw Error('Plans changed in another tab. Reload this page before editing. Export your current plan first if needed.');
    const raw=JSON.stringify(validateDatabase(db));
    this.storage.setItem(STORAGE_KEY,raw); this.lastRead=raw;
  }
  clear() {
    if(this.storage.getItem(STORAGE_KEY)!==this.lastRead) throw Error('Plans changed in another tab. Reload before clearing.');
    this.storage.removeItem(STORAGE_KEY); this.lastRead=null;
  }
}
