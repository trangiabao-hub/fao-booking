/**
 * Mồi “Thuê hôm nay” — preset lịch + giá ưu đãi + check trống realtime (API).
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { escapeHtml } from "../static-site-layout.mjs";
import { formatVnd } from "./deviceCatalogSeo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PICKUP_TIME = "09:00";
const RETURN_TIME = "09:00";
const EVENING_PICKUP = "20:30";

let holidayDatesCache = null;
function getHolidayDates() {
  if (holidayDatesCache) return holidayDatesCache;
  try {
    const raw = readFileSync(join(__dirname, "../../src/data/holidays.json"), "utf8");
    const data = JSON.parse(raw);
    holidayDatesCache = (data.holidays || []).map((h) => h.date);
  } catch {
    holidayDatesCache = [];
  }
  return holidayDatesCache;
}

export function resolveDefaultBranchId(m) {
  if (m.defaultBranchId) return m.defaultBranchId;
  if (m.branches?.length === 1) return m.branches[0];
  if (m.branches?.includes("PHU_NHUAN")) return "PHU_NHUAN";
  return m.branches?.[0] || "PHU_NHUAN";
}

export const TODAY_HOOK_CSS = `
  .review-today-hook{
    position:relative;margin-bottom:var(--space-6);padding:var(--space-5);
    background:linear-gradient(135deg,#fff7fb 0%,#fff 48%,#f0fdf4 100%);
    border:1px solid rgba(232,92,156,.28);border-radius:var(--radius-xl);
    box-shadow:0 8px 32px rgba(232,92,156,.12);overflow:hidden;
  }
  [data-theme="dark"] .review-today-hook{
    background:linear-gradient(135deg,rgba(232,92,156,.1) 0%,var(--blog-surface) 50%,rgba(16,185,129,.06) 100%);
    border-color:rgba(232,92,156,.35);
  }
  .review-today-hook::before{
    content:"";position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,var(--blog-accent),#34d399,var(--blog-accent));
  }
  .review-today-hook-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-4)}
  .review-today-hook-head h2{font-family:var(--font-display);font-size:1.125rem;font-weight:800;color:var(--blog-ink);margin:0;display:flex;align-items:center;gap:8px}
  .review-today-hook-head h2 .fire{font-size:1.25rem;line-height:1}
  .review-today-hook-date{font-size:.8125rem;font-weight:600;color:var(--blog-muted)}
  .review-today-status{
    display:inline-flex;align-items:center;gap:8px;font-size:.8125rem;font-weight:700;
    padding:6px 12px;border-radius:999px;background:var(--blog-bg);border:1px solid var(--blog-line);
  }
  .review-today-status .dot{width:8px;height:8px;border-radius:50%;background:var(--blog-muted);flex-shrink:0}
  .review-today-status.is-loading .dot{animation:todayPulse 1s ease infinite}
  .review-today-status.is-available{background:#ecfdf5;border-color:#6ee7b7;color:#047857}
  .review-today-status.is-available .dot{background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.25)}
  .review-today-status.is-busy{background:#fef2f2;border-color:#fca5a5;color:#b91c1c}
  .review-today-status.is-busy .dot{background:#ef4444}
  .review-today-status.is-unknown{background:#fffbeb;border-color:#fcd34d;color:#b45309}
  .review-today-status.is-unknown .dot{background:#f59e0b}
  @keyframes todayPulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
  .review-today-body{display:grid;gap:var(--space-4);align-items:center}
  @media(min-width:768px){.review-today-body{grid-template-columns:1fr auto}}
  .review-today-pricing{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--space-3)}
  .review-today-pricing .original{font-size:1rem;color:var(--blog-muted);text-decoration:line-through;font-weight:600}
  .review-today-pricing .discounted{font-family:var(--font-display);font-size:clamp(1.75rem,4vw,2.25rem);font-weight:800;color:var(--blog-accent);letter-spacing:-.03em;line-height:1}
  .review-today-pricing .discounted.no-sale{color:var(--blog-ink)}
  .review-today-pricing .badge{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:4px 10px;border-radius:999px;background:var(--blog-accent-soft);color:var(--blog-accent)}
  .review-today-slot{font-size:.8125rem;color:var(--blog-muted);margin-top:6px;line-height:1.5}
  .review-today-cta{display:flex;flex-direction:column;gap:var(--space-2);min-width:min(100%,220px)}
  .review-today-cta a{
    display:flex;align-items:center;justify-content:center;min-height:48px;padding:0 var(--space-5);
    border-radius:999px;font-weight:700;font-size:.9375rem;text-decoration:none!important;transition:transform .2s,box-shadow .2s;
  }
  .review-today-cta .btn-book{background:var(--blog-accent);color:#fff!important;box-shadow:0 6px 24px rgba(232,92,156,.35)}
  .review-today-cta .btn-book:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(232,92,156,.45)}
  .review-today-cta .btn-book.is-disabled{opacity:.55;pointer-events:none;box-shadow:none}
  .review-today-cta .btn-alt{color:var(--blog-ink)!important;border:1px solid var(--blog-line);background:var(--blog-surface);font-size:.8125rem;min-height:40px}
  .review-today-units{font-size:.75rem;color:var(--blog-muted);text-align:center}
`;

export function renderTodayHook(m, bookHref, branchLabel) {
  const branchId = resolveDefaultBranchId(m);
  const branchName =
    branchId === "Q9" ? "Q9 Thủ Đức" : branchId === "PHU_NHUAN" ? "Phú Nhuận" : branchLabel;
  const branchList = JSON.stringify(m.branches || [branchId]);

  return `<section class="review-today-hook" data-today-hook="1"
    data-model-key="${escapeHtml(m.modelKey)}"
    data-branch-id="${escapeHtml(branchId)}"
    data-branches="${escapeHtml(branchList)}"
    data-branch-label="${escapeHtml(branchName)}"
    data-price-one-day="${m.priceOneDay || 0}"
    data-unit-count="${m.unitCount || 1}"
    data-book-base="${escapeHtml(bookHref)}"
    data-display-name="${escapeHtml(m.displayName)}"
    aria-label="Thuê ${escapeHtml(m.displayName)} hôm nay">
    <div class="review-today-hook-head">
      <div>
        <h2><span class="fire" aria-hidden="true">🔥</span> Thuê hôm nay</h2>
        <div class="review-today-hook-date" data-today-date>Đang tải lịch…</div>
      </div>
      <div class="review-today-status is-loading" data-today-status role="status">
        <span class="dot" aria-hidden="true"></span>
        <span data-today-status-text>Đang kiểm tra máy trống…</span>
      </div>
    </div>
    <div class="review-today-body">
      <div>
        <div class="review-today-pricing">
          <span class="original" data-today-original hidden></span>
          <span class="discounted" data-today-price>${escapeHtml(formatVnd(m.priceOneDay))}</span>
          <span class="badge" data-today-badge hidden>Giảm 20%</span>
        </div>
        <p class="review-today-slot" data-today-slot>Nhận ${PICKUP_TIME} · Trả ${RETURN_TIME} ngày mai · ${escapeHtml(branchName)}</p>
      </div>
      <div class="review-today-cta">
        <a class="btn-book" href="${escapeHtml(bookHref)}" data-today-book data-catalog-book="1">Đặt lịch hôm nay →</a>
        <a class="btn-alt" href="/catalog?modelKey=${encodeURIComponent(m.modelKey)}&amp;q=${encodeURIComponent(m.modelKey)}" data-today-catalog-alt>Chọn ngày khác</a>
        <span class="review-today-units" data-today-units></span>
      </div>
    </div>
  </section>`;
}

export function renderTodayHookScript(apiBaseUrl) {
  const holidays = JSON.stringify(getHolidayDates());
  const api = JSON.stringify(apiBaseUrl.replace(/\/+$/, "") + "/");

  return `<script>
(function(){
  var API_BASE=${api};
  var HOLIDAYS=${holidays};
  var PICKUP="${PICKUP_TIME}";
  var RETURN_T="${RETURN_TIME}";
  var EVENING="${EVENING_PICKUP}";

  function vnTodayParts(){
    var fmt=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"});
    var parts=fmt.formatToParts(new Date());
    var y,m,d;
    parts.forEach(function(p){if(p.type==="year")y=p.value;if(p.type==="month")m=p.value;if(p.type==="day")d=p.value;});
    return {y:+y,m:+m,d:+d,str:y+"-"+m+"-"+d};
  }
  function addDaysStr(str,n){
    var p=str.split("-");
    var dt=new Date(+p[0],+p[1]-1,+p[2]);
    dt.setDate(dt.getDate()+n);
    return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0");
  }
  function fmtDateViFromStr(str){
    var p=str.split("-");
    return (+p[2])+"/"+(+p[1])+"/"+p[0];
  }
  function vnDateTime(dateStr,time){return dateStr+"T"+time+":00+07:00";}
  function parseMs(iso){return new Date(iso).getTime();}
  function fmtVnd(n){
    if(!n||n<=0) return "Liên hệ";
    return Math.round(n).toLocaleString("vi-VN")+"đ";
  }
  function round1k(n){return Math.floor(n/1000)*1000;}
  function isHolidayStr(str){return HOLIDAYS.indexOf(str)>=0;}
  function isWeekdayStr(str){
    var p=str.split("-");
    var dow=new Date(+p[0],+p[1]-1,+p[2]).getDay();
    return dow>=1&&dow<=5&&!isHolidayStr(str);
  }
  function normalizeBranch(raw){
    var n=String(raw||"").trim().toUpperCase().replace(/[\\s._-]/g,"");
    if(n==="Q9"||n==="QUAN9"||n==="THUDUC") return "Q9";
    return "PHU_NHUAN";
  }
  function deviceBranch(d){
    return normalizeBranch(d.branch||d.branchId||d.deviceBranch||"");
  }
  function overlaps(bf,bt,sf,st){return bf<st&&bt>sf;}
  function filterSlot(bookings,sf,st){
    return (bookings||[]).filter(function(b){
      if(!b||!b.bookingFrom||!b.bookingTo) return false;
      var bf=parseMs(b.bookingFrom), bt=parseMs(b.bookingTo);
      if(isNaN(bf)||isNaN(bt)) return false;
      return overlaps(bf,bt,sf,st);
    });
  }
  function countFree(units,sf,st){
    var free=0;
    units.forEach(function(d){
      if(filterSlot(d.bookingDtos||[],sf,st).length===0) free++;
    });
    return free;
  }
  function computeDiscount(price,pickupStr){
    var orig=round1k(price);
    if(!isWeekdayStr(pickupStr)) return {original:orig,discounted:orig,label:null};
    return {original:orig,discounted:round1k(price*0.8),label:"Giảm 20% T2–T6"};
  }
  function buildBookUrl(base,params){
    var u=new URL(base,location.origin);
    Object.keys(params).forEach(function(k){if(params[k]!=null) u.searchParams.set(k,params[k]);});
    u.searchParams.set("availability","1");
    u.searchParams.set("book","1");
    u.searchParams.set("utm_source","fao_seo");
    u.searchParams.set("utm_medium","landing");
    return u.pathname+u.search;
  }
  function slotRange(pickupStr,pickupTime,returnStr,returnTime){
    return {sf:parseMs(vnDateTime(pickupStr,pickupTime)),st:parseMs(vnDateTime(returnStr,returnTime))};
  }
  function setStatus(el,text,state){
    var box=el.querySelector("[data-today-status]");
    var label=el.querySelector("[data-today-status-text]");
    if(!box||!label) return;
    box.className="review-today-status "+state;
    label.textContent=text;
  }

  /** Khớp catalog: ONE_DAY sáng 9h → trả 9h ngày mai; booking API endDate +1 ngày sau ngày trả. */
  var SLOT_PRESETS=[
    {id:"morning",pickup:PICKUP,ret:RETURN_T,returnOffset:1,pickupType:"MORNING",label:"Nhận "+PICKUP+" hôm nay · Trả "+RETURN_T},
    {id:"evening",pickup:EVENING,ret:EVENING,returnOffset:1,pickupType:"EVENING",label:"Nhận "+EVENING+" tối nay · Trả "+EVENING+" ngày mai"},
    {id:"six",pickup:"15:00",ret:"21:00",returnOffset:0,pickupType:"AFTERNOON",durationType:"SIX_HOURS",label:"Thuê 6 tiếng · Nhận 15:00 hôm nay"}
  ];

  function fetchBooking(branchId,pickupStr,returnStr){
    var lookupEnd=addDaysStr(returnStr,1);
    return fetch(API_BASE+"v1/devices/booking?startDate="+encodeURIComponent(pickupStr)+"&endDate="+encodeURIComponent(lookupEnd)+"&branchId="+encodeURIComponent(branchId),{credentials:"omit"})
      .then(function(r){return r.ok?r.json():[];})
      .catch(function(){return[];});
  }

  function modelUnits(devices,modelKey,branchId){
    return (devices||[]).filter(function(d){
      return String(d.type||"").toUpperCase()==="DEVICE"
        && String(d.modelKey||"").trim()===modelKey
        && deviceBranch(d)===branchId;
    });
  }

  function evaluateBranch(modelKey,branchId,devices,preset,todayStr){
    var retStr=preset.returnOffset?addDaysStr(todayStr,preset.returnOffset):todayStr;
    var range=slotRange(todayStr,preset.pickup,retStr,preset.ret);
    var units=modelUnits(devices,modelKey,branchId);
    if(!units.length) return null;
    var free=countFree(units,range.sf,range.st);
    return {branchId:branchId,free:free,total:units.length,preset:preset,retStr:retStr,range:range};
  }

  function runHook(el){
    var modelKey=el.dataset.modelKey;
    var primaryBranch=normalizeBranch(el.dataset.branchId||"PHU_NHUAN");
    var branchLabel=el.dataset.branchLabel||"Phú Nhuận";
    var price=Number(el.dataset.priceOneDay)||0;
    var bookBase=el.dataset.bookBase||"/catalog";
    var branches;
    try{branches=JSON.parse(el.dataset.branches||"[]");}catch(e){branches=[primaryBranch];}
    if(!branches.length) branches=[primaryBranch];
    branches=branches.map(normalizeBranch);
    var branchOrder=[primaryBranch].concat(branches.filter(function(b){return b!==primaryBranch;}));

    var today=vnTodayParts().str;
    var dateEl=el.querySelector("[data-today-date]");
    if(dateEl) dateEl.textContent=fmtDateViFromStr(today)+" · "+branchLabel;

    var disc=computeDiscount(price,today);
    var origEl=el.querySelector("[data-today-original]");
    var priceEl=el.querySelector("[data-today-price]");
    var badgeEl=el.querySelector("[data-today-badge]");
    if(priceEl){
      priceEl.textContent=fmtVnd(disc.discounted);
      priceEl.classList.toggle("no-sale",!disc.label);
    }
    if(origEl&&badgeEl){
      if(disc.label&&disc.discounted<disc.original){
        origEl.textContent=fmtVnd(disc.original);origEl.hidden=false;
        badgeEl.textContent=disc.label;badgeEl.hidden=false;
      } else {origEl.hidden=true;badgeEl.hidden=true;}
    }

    var bookBtn=el.querySelector("[data-today-book]");
    var slotEl=el.querySelector("[data-today-slot]");
    var unitsEl=el.querySelector("[data-today-units]");

    Promise.all(branchOrder.map(function(bid){return fetchBooking(bid,today,addDaysStr(today,1)).then(function(devices){return {branchId:bid,devices:devices};});}))
      .then(function(branchPayloads){
        var best=null;
        branchOrder.forEach(function(bid){
          var payload=branchPayloads.find(function(p){return p.branchId===bid;});
          if(!payload) return;
          for(var i=0;i<SLOT_PRESETS.length;i++){
            var ev=evaluateBranch(modelKey,bid,payload.devices,SLOT_PRESETS[i],today);
            if(!ev||ev.free<=0) continue;
            if(!best||ev.free>best.free||(ev.free===best.free&&ev.preset.id==="morning")) best=ev;
            break;
          }
        });

        if(best){
          var p=best.preset;
          var bName=best.branchId==="Q9"?"Q9 Thủ Đức":"Phú Nhuận";
          if(slotEl) slotEl.textContent=p.label+" "+fmtDateViFromStr(best.retStr)+(p.returnOffset?"":" hôm nay")+" · "+bName;
          var bookParams={
            modelKey:modelKey,q:modelKey,branchId:best.branchId,
            date:today,endDate:best.retStr,
            durationType:p.durationType||"ONE_DAY",
            pickupType:p.pickupType,pickupSlot:p.pickup,timeFrom:p.pickup,timeTo:p.ret
          };
          var bookUrl=buildBookUrl(bookBase,bookParams);
          if(bookBtn){bookBtn.href=bookUrl;bookBtn.textContent="Đặt hôm nay — còn máy →";bookBtn.classList.remove("is-disabled");}
          document.querySelectorAll("[data-today-book-sync]").forEach(function(a){a.href=bookUrl;});
          setStatus(el,"Còn máy · đặt ngay","is-available");
          if(unitsEl){
            unitsEl.textContent=best.free===1
              ?("Còn 1 máy trống · "+bName+(p.id!=="morning"?" · "+p.label:""))
              :("Còn "+best.free+" máy trống · "+bName+(p.id!=="morning"?" · "+p.label:""));
          }
          return;
        }

        var primaryUnits=[];
        branchPayloads.forEach(function(p){
          if(p.branchId===primaryBranch) primaryUnits=primaryUnits.concat(modelUnits(p.devices,modelKey,primaryBranch));
        });
        if(!primaryUnits.length){
          setStatus(el,"Kiểm tra trên catalog","is-unknown");
          if(bookBtn) bookBtn.textContent="Xem lịch trên catalog →";
          if(unitsEl) unitsEl.textContent="";
          return;
        }

        setStatus(el,"Hết máy khung giờ phổ biến","is-busy");
        if(slotEl) slotEl.textContent="Thử đổi giờ nhận/trả trên catalog · "+branchLabel;
        if(unitsEl) unitsEl.textContent="Gói sáng 9h & tối 20:30 đều kín — chọn ngày khác";
        if(bookBtn){
          bookBtn.textContent="Chọn ngày khác →";
          bookBtn.href=buildBookUrl(bookBase,{modelKey:modelKey,q:modelKey,branchId:primaryBranch});
        }
      })
      .catch(function(){
        setStatus(el,"Xem lịch trên catalog","is-unknown");
      });
  }

  document.querySelectorAll("[data-today-hook]").forEach(runHook);
})();
</script>`;
}
