import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('admin displays independent top-level navigation for every tool group',()=>{
  const src=readFileSync(new URL('../src/admin.tsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/admin.css',import.meta.url),'utf8');
  for(const name of ['ภาพรวม','คำยอดนิยม','ความหายาก','คำเสนอแนะ','ค้นคำศัพท์','เพิ่ม / จัดคำ','ดาวน์โหลด'])
    assert.ok(src.includes("label:'"+name+"'"),'missing tab '+name);
  assert.match(src,/className="admin-tabs"/);
  assert.match(src,/aria-current=\{activeTab===tab.id\?'page':undefined\}/);
  for(const id of ['overview','popularity','rarity','suggestions','search','edit','export']){
    assert.ok(src.includes("visitedTabs.includes('"+id+"')"),'unvisited tab mounted: '+id);
    assert.ok(src.includes("hidden={activeTab!=='"+id+"'}"),'tab not hidden: '+id);
  }
  assert.match(css,/\.admin-tab-content\[hidden\]\{display:none!important\}/);
  assert.match(src,/openTab\('search','admin-vocabulary-search'\)/);
  assert.match(src,/openTab\('edit','admin-add-words'\)/);
  assert.match(src,/setVisitedTabs\(current=>current.includes\(tab\)/);
  assert.doesNotMatch(src,/className="admin-shortcuts"/);
});
