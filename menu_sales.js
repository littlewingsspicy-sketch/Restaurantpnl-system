/* ─────────────── DAILY MENU SALES ───────────────
   Phase 1: กึ่ง POS — บันทึกจำนวนขายรายวันจากรายการเมนูใน Food Cost / recipes
   ไม่แตะ P&L, Cashflow, Workspace, Inventory ในเฟสนี้
*/
const LOCAL_MENU_SALES_KEY="nrk_menu_sales_v1";

function loadLocalMenuSales(){
  try{return JSON.parse(localStorage.getItem(LOCAL_MENU_SALES_KEY)||"[]")}
  catch(e){return []}
}
function saveLocalMenuSales(rows){
  localStorage.setItem(LOCAL_MENU_SALES_KEY,JSON.stringify(rows||[]));
}
async function loadMenuSales(){
  const {data,error}=await db.from("menu_sales").select("*");
  const local=loadLocalMenuSales();
  if(error){
    console.warn("menu_sales load fallback:", error.message);
    return local;
  }
  const localOnly=local.filter(r=>String(r.local_only)==="true");
  return [...(data||[]),...localOnly];
}
function initMenuSalesDate(){
  const el=document.getElementById("menuSalesDate");
  if(el&&!el.value) el.value=new Date().toISOString().slice(0,10);
}
function moveMenuSalesDate(delta){
  const el=document.getElementById("menuSalesDate");
  if(!el)return;
  initMenuSalesDate();
  const d=new Date(el.value||new Date().toISOString().slice(0,10));
  d.setDate(d.getDate()+delta);
  el.value=d.toISOString().slice(0,10);
  renderMenuSales();
}
function menuSalesDate(){
  initMenuSalesDate();
  return document.getElementById("menuSalesDate")?.value || new Date().toISOString().slice(0,10);
}
function recipeListForMenuSales(){
  return (recipes||[])
    .filter(r=>r && r.id && (r.is_active!==false));
}
function menuSalesSearchText(){
  return String(document.getElementById("menuSalesSearch")?.value||"").trim().toLowerCase();
}
function menuSalesSortMode(){
  return document.getElementById("menuSalesSort")?.value || "name_asc";
}
function clearMenuSalesFilters(){
  const q=document.getElementById("menuSalesSearch");
  if(q)q.value="";
  const s=document.getElementById("menuSalesSort");
  if(s)s.value="name_asc";
  renderMenuSales();
}
function recipeSearchText(r){
  return [r.name,r.category,r.brand_id,r.brand_name,r.type,r.menu_group]
    .map(x=>String(x||"").toLowerCase())
    .join(" ");
}
function menuSalesComparableNumber(r,field,date){
  if(field==="qty") return Number(menuSalesFor(date,r.id)?.qty_sold||0);
  if(field==="price") return recipeSellingPrice(r);
  if(field==="cost") return recipeFoodCost(r);
  if(field==="gp") return recipeGpPct(r);
  return 0;
}
function filteredMenuSalesRecipes(date){
  const q=menuSalesSearchText();
  const mode=menuSalesSortMode();
  let list=recipeListForMenuSales();

  if(q){
    list=list.filter(r=>recipeSearchText(r).includes(q));
  }

  list=list.slice();
  list.sort((a,b)=>{
    if(mode==="category_asc"){
      const c=String(a.category||"").localeCompare(String(b.category||""),"th");
      if(c!==0)return c;
      return String(a.name||"").localeCompare(String(b.name||""),"th");
    }
    if(mode==="qty_desc"){
      const c=menuSalesComparableNumber(b,"qty",date)-menuSalesComparableNumber(a,"qty",date);
      if(c!==0)return c;
      return String(a.name||"").localeCompare(String(b.name||""),"th");
    }
    if(mode==="saved_first"){
      const av=menuSalesFor(date,a.id)?1:0;
      const bv=menuSalesFor(date,b.id)?1:0;
      if(bv-av!==0)return bv-av;
      return String(a.name||"").localeCompare(String(b.name||""),"th");
    }
    if(mode==="price_desc"){
      const c=menuSalesComparableNumber(b,"price",date)-menuSalesComparableNumber(a,"price",date);
      if(c!==0)return c;
      return String(a.name||"").localeCompare(String(b.name||""),"th");
    }
    if(mode==="cost_desc"){
      const c=menuSalesComparableNumber(b,"cost",date)-menuSalesComparableNumber(a,"cost",date);
      if(c!==0)return c;
      return String(a.name||"").localeCompare(String(b.name||""),"th");
    }
    if(mode==="gp_desc" || mode==="gp_asc"){
      const av=menuSalesComparableNumber(a,"gp",date);
      const bv=menuSalesComparableNumber(b,"gp",date);
      const c=mode==="gp_desc" ? bv-av : av-bv;
      if(c!==0)return c;
      return String(a.name||"").localeCompare(String(b.name||""),"th");
    }
    return String(a.name||"").localeCompare(String(b.name||""),"th");
  });
  return list;
}
function recipeSellingPrice(r){
  return Number(r.selling_price ?? r.sale_price ?? r.menu_price ?? r.price ?? r.sell_price ?? r.retail_price ?? 0) || 0;
}
function recipeFoodCost(r){
  return Number(r.cost_per_serving ?? r.food_cost ?? r.cost_per_unit ?? r.total_cost ?? r.recipe_cost ?? 0) || 0;
}
function recipeGpPct(r){
  const price=recipeSellingPrice(r);
  const cost=recipeFoodCost(r);
  return price ? ((price-cost)/price*100) : 0;
}
function menuSalesFor(date,recipeId){
  return (menuSales||[]).find(r=>String(r.sale_date||r.date)===String(date)&&String(r.recipe_id)===String(recipeId));
}
function inputNumber(id){return Number(document.getElementById(id)?.value||0)||0}
function previewMenuSalesRow(recipeId){
  const r=recipeListForMenuSales().find(x=>String(x.id)===String(recipeId));
  if(!r)return;
  const qty=inputNumber(`ms_qty_${recipeId}`);
  const price=inputNumber(`ms_price_${recipeId}`);
  const cost=inputNumber(`ms_cost_${recipeId}`);
  const sales=qty*price;
  const totalCost=qty*cost;
  const gp=sales-totalCost;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=B(val)};
  set(`ms_total_sales_${recipeId}`,sales);
  set(`ms_total_cost_${recipeId}`,totalCost);
  set(`ms_gp_${recipeId}`,gp);
}
function buildMenuSalesRow(date,r){
  const existing=menuSalesFor(date,r.id)||{};
  const qty=Number(existing.qty_sold||0);
  const price=Number(existing.selling_price ?? recipeSellingPrice(r));
  const cost=Number(existing.food_cost ?? recipeFoodCost(r));
  const totalSales=qty*price;
  const totalCost=qty*cost;
  const gp=totalSales-totalCost;
  const gpPct=price?((price-cost)/price*100):0;
  return `
    <tr>
      <td>${r.name||""}</td>
      <td class="text-right td-mono"><input id="ms_price_${r.id}" type="number" value="${price}" oninput="previewMenuSalesRow('${r.id}')"></td>
      <td class="text-right td-mono"><input id="ms_cost_${r.id}" type="number" value="${cost}" oninput="previewMenuSalesRow('${r.id}')"></td>
      <td class="text-right td-mono">${gpPct.toFixed(1)}%</td>
      <td class="text-right td-mono"><input id="ms_qty_${r.id}" type="number" step="1" value="${qty||""}" placeholder="0" oninput="previewMenuSalesRow('${r.id}')"></td>
      <td class="text-right td-mono" id="ms_total_sales_${r.id}">${B(totalSales)}</td>
      <td class="text-right td-mono" id="ms_total_cost_${r.id}">${B(totalCost)}</td>
      <td class="text-right td-mono" id="ms_gp_${r.id}">${B(gp)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="saveMenuSale('${r.id}')">บันทึก</button>
        ${existing.id?`<button class="btn btn-danger btn-sm" onclick="deleteMenuSale('${existing.id}')">ลบ</button>`:""}
      </td>
    </tr>`;
}
function renderMenuSales(){
  initMenuSalesDate();
  const date=menuSalesDate();
  const dateLabel=document.getElementById("menuSalesDateLabel");
  if(dateLabel)dateLabel.textContent=date;
  const allList=recipeListForMenuSales().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"th"));
  const list=filteredMenuSalesRecipes(date);
  const rows=(menuSales||[]).filter(r=>String(r.sale_date||r.date)===String(date));
  const totalQty=rows.reduce((a,r)=>a+Number(r.qty_sold||0),0);
  const totalSales=rows.reduce((a,r)=>a+Number(r.total_sales||0),0);
  const totalCost=rows.reduce((a,r)=>a+Number(r.total_cost||0),0);
  const totalGp=totalSales-totalCost;
  const setText=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  setText("msKpiQty",totalQty.toLocaleString("th-TH"));
  setText("msKpiSales",B(totalSales));
  setText("msKpiCost",B(totalCost));
  setText("msKpiGp",B(totalGp));
  const hint=document.getElementById("menuSalesFilterHint");
  if(hint){
    const q=menuSalesSearchText();
    hint.textContent=q
      ? `แสดง ${list.length.toLocaleString("th-TH")} จาก ${allList.length.toLocaleString("th-TH")} เมนู`
      : `ทั้งหมด ${allList.length.toLocaleString("th-TH")} เมนู`;
  }
  const tbl=document.getElementById("menuSalesTbl");
  if(tbl){
    tbl.innerHTML=list.length
      ? list.map(r=>buildMenuSalesRow(date,r)).join("")
      : (allList.length
        ? '<tr><td colspan="9" class="empty">ไม่พบเมนูที่ค้นหา</td></tr>'
        : '<tr><td colspan="9" class="empty">ยังไม่มีเมนูจากหน้า Food Cost / recipes</td></tr>');
  }
  const savedTbl=document.getElementById("menuSalesSavedTbl");
  if(savedTbl){
    savedTbl.innerHTML=rows
      .sort((a,b)=>String(a.recipe_name||"").localeCompare(String(b.recipe_name||""),"th"))
      .map(r=>`<tr><td>${r.recipe_name||""}</td><td class="text-right td-mono">${Number(r.qty_sold||0).toLocaleString("th-TH")}</td><td class="text-right td-mono">${B(r.total_sales)}</td><td class="text-right td-mono">${B(r.total_cost)}</td><td class="text-right td-mono">${B(Number(r.total_sales||0)-Number(r.total_cost||0))}</td></tr>`)
      .join("") || '<tr><td colspan="5" class="empty">ยังไม่มีรายการที่บันทึกวันนี้</td></tr>';
  }
}
async function saveMenuSale(recipeId){
  const r=recipeListForMenuSales().find(x=>String(x.id)===String(recipeId));
  if(!r)return alert("ไม่พบเมนู");
  const date=menuSalesDate();
  const qty=inputNumber(`ms_qty_${recipeId}`);
  const price=inputNumber(`ms_price_${recipeId}`);
  const cost=inputNumber(`ms_cost_${recipeId}`);
  if(qty<0)return alert("จำนวนขายต้องไม่ติดลบ");
  const existing=menuSalesFor(date,recipeId);
  const row={
    id:existing?.id || `menusale_${date}_${recipeId}`,
    sale_date:date,
    recipe_id:recipeId,
    recipe_name:r.name||"",
    qty_sold:qty,
    selling_price:price,
    food_cost:cost,
    total_sales:qty*price,
    total_cost:qty*cost,
    gross_profit:(qty*price)-(qty*cost),
    updated_at:new Date().toISOString()
  };
  const res=await db.from("menu_sales").upsert(row);
  if(res.error){
    const local=loadLocalMenuSales().filter(x=>String(x.id)!==String(row.id));
    local.push({...row,local_only:"true"});
    saveLocalMenuSales(local);
  }
  menuSales=await loadMenuSales();
  renderMenuSales();
  showSaveHint();
}
async function saveAllMenuSales(){
  const list=recipeListForMenuSales();
  for(const r of list){
    const qtyEl=document.getElementById(`ms_qty_${r.id}`);
    if(qtyEl && String(qtyEl.value||"").trim()!=="") await saveMenuSale(r.id);
  }
  menuSales=await loadMenuSales();
  renderMenuSales();
  showSaveHint();
}
async function deleteMenuSale(id){
  if(!confirm("ลบรายการขายเมนูนี้?"))return;
  const local=loadLocalMenuSales().filter(r=>String(r.id)!==String(id));
  saveLocalMenuSales(local);
  await db.from("menu_sales").delete().eq("id",id);
  menuSales=await loadMenuSales();
  renderMenuSales();
  showSaveHint();
}
