/* ─────────────── INGREDIENTS ─────────────── */
function ingredientPurchaseQty(i){
  return Number(i?.purchase_qty ?? i?.latest_purchase_qty ?? 1) || 1;
}
function calcIngredientCpu(price,purchaseQty,convertRate,yieldPct){
  const p=Number(price||0);
  const pq=Number(purchaseQty||1);
  const cr=Number(convertRate)||1;
  const y=(Number(yieldPct||100)/100);
  return pq&&cr&&y ? p/(pq*cr*y) : 0;
}
function calcIngredientPreview(){
  const purchaseQty=N("ipq")||1;
  const conversionRate=N("icv")||1;
  const totalUseQty=calcTotalUseQty(purchaseQty,conversionRate);

  const totalEl=document.getElementById("iuq");
  if(totalEl){
    const unit=V("iuu")||"";
    totalEl.value=Number(totalUseQty||0).toLocaleString("th-TH")+(unit?` ${unit}`:"");
  }

  const el=document.getElementById("icpu");
  if(el){
    el.value=calcIngredientCpu(N("ipp"),1,totalUseQty,N("iy")).toFixed(4);
  }
}
async function saveIng(){
  const id=editIng||uid("ing");
  const purchaseQty=N("ipq")||1;
  const conversionRate=N("icv")||1;
  const totalUseQty=calcTotalUseQty(purchaseQty,conversionRate);
  const cpu=calcIngredientCpu(N("ipp"),1,totalUseQty,N("iy"));

  const row={
    id,
    name:V("inm"),
    category:V("icat"),
    purchase_qty:purchaseQty,
    latest_purchase_qty:purchaseQty,
    purchase_unit:V("ipu"),
    usage_unit:V("iuu"),
    convert_rate:totalUseQty,
    conversion_rate:conversionRate,
    yield_rate:(N("iy")||100)/100,
    unit_purchase_cost:N("ipp"),
    cost_per_use:cpu,
    is_active:true,
    updated_at:new Date().toISOString()
  };

  const res=await db.from("ingredients").upsert(row);
  if(res.error){alert(res.error.message);return;}

  editIng=null;
  clearIng();
  await load(false);
  ingTable();
  showSaveHint();
}
function clearIng(){
  ["inm","ipu","ipp","icv","iuu","iuq","iy","icpu","ipq"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.value="";
  });
  const y=document.getElementById("iy"); if(y)y.value=100;
  const q=document.getElementById("ipq"); if(q)q.value=1;
  const cv=document.getElementById("icv"); if(cv)cv.value=1;
  editIng=null;
}
function editIngredient(id){
  const i=ings.find(x=>x.id===id);
  if(!i)return;
  editIng=id;
  document.getElementById("inm").value=i.name||"";
  document.getElementById("icat").value=i.category||"วัตถุดิบอาหาร";
  document.getElementById("ipq").value=ingredientPurchaseQty(i)||1;
  document.getElementById("ipu").value=i.purchase_unit||"";
  document.getElementById("ipp").value=i.unit_purchase_cost||0;
  document.getElementById("icv").value=i.conversion_rate||(
    Number(i.convert_rate||0) && Number(ingredientPurchaseQty(i)||0)
      ? Number(i.convert_rate||0)/Number(ingredientPurchaseQty(i)||1)
      : 1
  );
  document.getElementById("iuu").value=i.usage_unit||"";
  document.getElementById("iy").value=((i.yield_rate||1)*100).toFixed(0);
  calcIngredientPreview();
  window.scrollTo({top:0,behavior:"smooth"});
}

let inlineEditIngId=null;

function escAttr(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function escText(v){
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function ingredientCategoryOptions(selected){
  const cats=["วัตถุดิบอาหาร","เครื่องดื่ม","Packaging","Kitchen Utility / Gas","ของหวาน","วัสดุสิ้นเปลือง","อื่นๆ"];
  return cats.map(c=>`<option value="${escAttr(c)}" ${String(selected||"")===c?'selected':''}>${escText(c)}</option>`).join("");
}

function startInlineEditIngredient(id){
  inlineEditIngId=id;
  ingTable();
}

function cancelInlineEdit(){
  inlineEditIngId=null;
  ingTable();
}

function previewInlineIngredient(id){
  const purchaseQty=Number(document.getElementById(`e_ipq_${id}`)?.value||1);
  const conversionRate=Number(document.getElementById(`e_icv_${id}`)?.value||1);
  const totalUseQty=calcTotalUseQty(purchaseQty,conversionRate);
  const price=Number(document.getElementById(`e_price_${id}`)?.value||0);
  const yieldPct=Number(document.getElementById(`e_y_${id}`)?.value||100);
  const usageUnit=document.getElementById(`e_uu_${id}`)?.value||"";
  const totalEl=document.getElementById(`e_total_${id}`);
  const cpuEl=document.getElementById(`e_cpu_${id}`);
  if(totalEl) totalEl.textContent=Number(totalUseQty||0).toLocaleString("th-TH")+(usageUnit?` ${usageUnit}`:"");
  if(cpuEl) cpuEl.textContent=B(calcIngredientCpu(price,1,totalUseQty,yieldPct));
}

async function saveInlineIngredient(id){
  const purchaseQty=Number(document.getElementById(`e_ipq_${id}`)?.value||1);
  const conversionRate=Number(document.getElementById(`e_icv_${id}`)?.value||1);
  const totalUseQty=calcTotalUseQty(purchaseQty,conversionRate);
  const yieldPct=Number(document.getElementById(`e_y_${id}`)?.value||100);
  const price=Number(document.getElementById(`e_price_${id}`)?.value||0);

  const row={
    id:id,
    name:document.getElementById(`e_name_${id}`)?.value||"",
    category:document.getElementById(`e_cat_${id}`)?.value||"อื่นๆ",
    purchase_qty:purchaseQty,
    latest_purchase_qty:purchaseQty,
    purchase_unit:document.getElementById(`e_pu_${id}`)?.value||"",
    usage_unit:document.getElementById(`e_uu_${id}`)?.value||"",
    convert_rate:totalUseQty,
    conversion_rate:conversionRate,
    yield_rate:yieldPct/100,
    unit_purchase_cost:price,
    cost_per_use:calcIngredientCpu(price,1,totalUseQty,yieldPct),
    is_active:true,
    updated_at:new Date().toISOString()
  };

  if(!row.name.trim()){
    alert("กรุณาใส่ชื่อวัตถุดิบ");
    return;
  }

  const res=await db.from("ingredients").upsert(row);
  if(res.error){
    alert(res.error.message);
    return;
  }

  inlineEditIngId=null;
  await load(false);
  ingTable();
  showSaveHint();
}

function ingTable(){
  const tbl=document.getElementById("ingTbl");if(!tbl)return;
  tbl.innerHTML=ings
  .filter(i => i.is_active !== false)
  .sort((a,b)=>{
    const catCompare=String(a.category||"").localeCompare(String(b.category||""),"th");
    if(catCompare!==0) return catCompare;
    return String(a.name||"").localeCompare(String(b.name||""),"th");
  })
  .map(i=>{
    const id=String(i.id);
    const purchaseQty=ingredientPurchaseQty(i)||1;
    const conversionRate=Number(i.conversion_rate || (Number(i.convert_rate||0) && purchaseQty ? Number(i.convert_rate||0)/purchaseQty : 1)) || 1;
    const totalUseQty=calcTotalUseQty(purchaseQty,conversionRate);
    const yieldPct=((i.yield_rate||1)*100).toFixed(0);

    if(inlineEditIngId===i.id){
      return `<tr>
        <td><input id="e_name_${escAttr(id)}" value="${escAttr(i.name)}"></td>
        <td><select id="e_cat_${escAttr(id)}">${ingredientCategoryOptions(i.category||"")}</select></td>
        <td><input id="e_ipq_${escAttr(id)}" type="number" value="${escAttr(purchaseQty)}" oninput="previewInlineIngredient('${escAttr(id)}')"></td>
        <td><input id="e_pu_${escAttr(id)}" list="unitMasterList" value="${escAttr(i.purchase_unit)}"></td>
        <td><input id="e_price_${escAttr(id)}" type="number" value="${escAttr(i.unit_purchase_cost||0)}" oninput="previewInlineIngredient('${escAttr(id)}')"></td>
        <td><input id="e_icv_${escAttr(id)}" type="number" value="${escAttr(conversionRate)}" oninput="previewInlineIngredient('${escAttr(id)}')"></td>
        <td class="text-right td-mono" id="e_total_${escAttr(id)}">${Number(totalUseQty||0).toLocaleString("th-TH")}${i.usage_unit?` ${escText(i.usage_unit)}`:""}</td>
        <td><input id="e_uu_${escAttr(id)}" list="unitMasterList" value="${escAttr(i.usage_unit)}" oninput="previewInlineIngredient('${escAttr(id)}')"></td>
        <td><input id="e_y_${escAttr(id)}" type="number" value="${escAttr(yieldPct)}" oninput="previewInlineIngredient('${escAttr(id)}')"></td>
        <td class="text-right td-mono" id="e_cpu_${escAttr(id)}">${B(i.cost_per_use)}</td>
        <td style="min-width:150px">
          <button class="btn btn-primary btn-sm" onclick="saveInlineIngredient('${escAttr(id)}')">บันทึก</button>
          <button class="btn btn-secondary btn-sm" onclick="cancelInlineEdit()">ยกเลิก</button>
        </td>
      </tr>`;
    }

    return `<tr>
      <td>${escText(i.name)}</td>
      <td>${escText(i.category||"")}</td>
      <td class="text-right td-mono">${Number(purchaseQty).toLocaleString("th-TH")}</td>
      <td>${escText(i.purchase_unit||"")}</td>
      <td class="text-right td-mono">${B(i.unit_purchase_cost)}</td>
      <td class="text-right td-mono">${Number(conversionRate).toLocaleString("th-TH")}</td>
      <td class="text-right td-mono">${Number(i.convert_rate||0).toLocaleString("th-TH")}</td>
      <td>${escText(i.usage_unit||"")}</td>
      <td>${yieldPct}%</td>
      <td class="text-right td-mono">${B(i.cost_per_use)}</td>
      <td style="min-width:130px">
        <button class="btn btn-secondary btn-sm" onclick="startInlineEditIngredient('${escAttr(id)}')">แก้ไข</button>
        <button class="btn btn-danger btn-sm" onclick="delIng('${escAttr(id)}')">ลบ</button>
      </td>
    </tr>`;
  }).join("")||'<tr><td colspan="11" class="empty">ยังไม่มีวัตถุดิบ</td></tr>';
}

async function delIng(id){
  if(!confirm("ปิดใช้งานวัตถุดิบนี้? ข้อมูลเก่าจะยังอยู่")) return;

  const { error } = await db
    .from("ingredients")
    .update({ is_active: false })
    .eq("id", id);

  if(error){
    alert(error.message);
    return;
  }

  await load(false);
  ingTable();
  showSaveHint();
}
