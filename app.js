// ==========================================
// 1. SUPABASE CLIENT
// ==========================================
const SUPABASE_URL = "https://oizxkqllwxoxxehvoouf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9penhrcWxsd3hveHhlaHZvb3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNTE2NDUsImV4cCI6MjEwODYyNzY0NX0.2ge7WdptAfLqLaSTeWxTgIDWsOaaeDbDuHRxa8PlYNA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. LEAFLET MAP & TILE LAYERS
// ==========================================
const BANG_RAKAM_CENTER = [16.758, 100.117];
const DEFAULT_ZOOM = 12;

// แผนที่ถนน: OpenStreetMap (นโยบายของ OSM ไม่เหมาะกับผู้ใช้จำนวนมาก — ถ้าเว็บโตให้เปลี่ยนไปใช้ผู้ให้บริการไทล์แบบมีบัญชี เช่น MapTiler)
const streetMap = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  maxZoom: 19
});

// ภาพถ่ายดาวเทียม: Esri World Imagery (ต้องแสดงที่มา Esri ตามเงื่อนไข ห้ามลบ attribution)
// ภาพความละเอียดสูงสุดในชนบทมักอยู่ราวระดับซูม 17 — ซูมเกินนี้จะขยายภาพจากระดับ 17
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const satelliteMap = L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  maxNativeZoom: 17,
  maxZoom: 19
});

// ชั้นถนนและชื่อสถานที่ซ้อนบนภาพดาวเทียม (ทดแทน Google แบบ hybrid ที่เคยมีป้ายถนน)
const satelliteLabels = L.layerGroup([
  L.tileLayer(`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 17, maxZoom: 19, zIndex: 5 }),
  L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 17, maxZoom: 19, zIndex: 6 })
]);

const map = L.map("map", { 
  zoomControl: false,
  layers: [satelliteMap, satelliteLabels]
}).setView(BANG_RAKAM_CENTER, DEFAULT_ZOOM);

L.control.layers({
  "ภาพถ่ายดาวเทียม": satelliteMap,
  "แผนที่ถนน": streetMap
}, null, { position: "topleft" }).addTo(map);

// ป้ายถนน/ชื่อสถานที่แสดงเฉพาะตอนใช้ภาพดาวเทียม
map.on("baselayerchange", (e) => {
  if (e.layer === streetMap) map.removeLayer(satelliteLabels);
  else if (!map.hasLayer(satelliteLabels)) satelliteLabels.addTo(map);
});

setTimeout(() => map.invalidateSize(), 300);

const zonesLayer = L.layerGroup().addTo(map);
const waterLayer = L.layerGroup().addTo(map);
const markersLayer = L.layerGroup().addTo(map);

let allReports = [];
let markerRegistry = {};
let currentViewMode = "subdistrict";
let isZonesVisible = true;
let isAdmin = false; // แค่คุม UI; ความปลอดภัยจริงอยู่ที่ RLS ใน security.sql

// ==========================================
// 3. ขอบเขตตำบลจริง 11 ตำบล อ.บางระกำ (โหลดจาก boundaries.js)
// ==========================================
const subdistrictBoundaries = BANGRAKAM_TAMBON.features.map(f => ({
  name: f.properties.name,
  center: f.properties.center,
  color: f.properties.color,
  feature: f
}));

// หาว่าพิกัดอยู่ในตำบลไหน (ray casting) ใช้เลือกตำบลอัตโนมัติตอนแจ้งเหตุ
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function findSubdistrict(lat, lng) {
  for (const z of subdistrictBoundaries) {
    const g = z.feature.geometry;
    const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    for (const poly of polys) {
      if (pointInRing(lng, lat, poly[0]) && !poly.slice(1).some(h => pointInRing(lng, lat, h))) return z.name;
    }
  }
  return null;
}

function renderSubdistrictZones() {
  zonesLayer.clearLayers();
  if (!isZonesVisible) return;

  subdistrictBoundaries.forEach(zone => {
    L.geoJSON(zone.feature, {
      style: {
        color: zone.color,
        weight: 2,
        opacity: 0.95,
        fillColor: zone.color,
        fillOpacity: 0.14,
        lineJoin: "round"
      }
    }).bindPopup(`
      <div class="font-sans text-xs">
        <h4 class="font-bold text-sm text-slate-800">ต.${esc(zone.name)}</h4>
        <p class="text-slate-500 text-[11px]">อ.บางระกำ จ.พิษณุโลก</p>
      </div>
    `).addTo(zonesLayer);

    L.marker(zone.center, {
      icon: L.divIcon({
        className: "zone-label",
        html: `<span>${esc(zone.name)}</span>`,
        iconSize: [64, 20],
        iconAnchor: [32, 10]
      }),
      interactive: false
    }).addTo(zonesLayer);
  });
}

const toggleZonesBtn = document.getElementById("toggleZonesBtn");
const toggleZonesText = document.getElementById("toggleZonesText");

if (toggleZonesBtn) {
  toggleZonesBtn.addEventListener("click", () => {
    isZonesVisible = !isZonesVisible;
    if (isZonesVisible) {
      toggleZonesBtn.classList.replace("bg-white", "bg-blue-50");
      toggleZonesBtn.classList.replace("text-slate-700", "text-blue-700");
      toggleZonesBtn.classList.replace("border-slate-300", "border-blue-300");
      if (toggleZonesText) toggleZonesText.innerText = "ซ่อนพื้นที่ตำบล";
    } else {
      toggleZonesBtn.classList.replace("bg-blue-50", "bg-white");
      toggleZonesBtn.classList.replace("text-blue-700", "text-slate-700");
      toggleZonesBtn.classList.replace("border-blue-300", "border-slate-300");
      if (toggleZonesText) toggleZonesText.innerText = "แสดงพื้นที่ตำบล";
    }
    renderSubdistrictZones();
  });
}

renderSubdistrictZones();

// ==========================================
// 4. แผงปุ่มควบคุมมุมขวาบน
// ==========================================
const customControls = L.Control.extend({
  options: { position: 'topright' },

  onAdd: function() {
    const container = L.DomUtil.create('div', 'leaflet-custom-controls leaflet-bar');

    const btnIn = L.DomUtil.create('button', 'leaflet-custom-btn', container);
    btnIn.innerHTML = '<i class="ph-bold ph-plus"></i>';
    btnIn.title = "ซูมเข้า";
    L.DomEvent.on(btnIn, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      map.zoomIn();
    });

    const btnOut = L.DomUtil.create('button', 'leaflet-custom-btn', container);
    btnOut.innerHTML = '<i class="ph-bold ph-minus"></i>';
    btnOut.title = "ซูมออก";
    L.DomEvent.on(btnOut, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      map.zoomOut();
    });

    L.DomUtil.create('div', 'leaflet-custom-divider', container);

    const btnReset = L.DomUtil.create('button', 'leaflet-custom-btn', container);
    btnReset.innerHTML = '<i class="ph-bold ph-crosshair"></i>';
    btnReset.title = "กลับจุดศูนย์กลางบางระกำ";
    L.DomEvent.on(btnReset, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      map.flyTo(BANG_RAKAM_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    });

    const btnFull = L.DomUtil.create('button', 'leaflet-custom-btn', container);
    btnFull.innerHTML = '<i id="customFullIcon" class="ph-bold ph-arrows-out"></i>';
    btnFull.title = "ขยายแผนที่เต็มจอ";
    
    L.DomEvent.on(btnFull, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      const mapContainer = document.getElementById("mapContainer");
      if (!document.fullscreenElement) {
        if (mapContainer.requestFullscreen) {
          mapContainer.requestFullscreen();
        } else if (mapContainer.webkitRequestFullscreen) {
          mapContainer.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    return container;
  }
});

map.addControl(new customControls());

document.addEventListener("fullscreenchange", () => {
  const icon = document.getElementById("customFullIcon");
  if (document.fullscreenElement) {
    if (icon) icon.className = "ph-bold ph-arrows-in";
  } else {
    if (icon) icon.className = "ph-bold ph-arrows-out";
  }
  setTimeout(() => map.invalidateSize(), 200);
});

// ==========================================
// 5. ICON & POPUP
// ==========================================
// ---- อายุของรายงาน: <6 ชม. ปกติ | 6–24 ชม. เริ่มเก่า (จาง) | ≥24 ชม. เก่า (จางมาก ไม่นับในสถิติ)
const REPORT_AGING_MS = 6 * 60 * 60 * 1000;
const REPORT_STALE_MS = 24 * 60 * 60 * 1000;

function reportAgeMs(item) {
  if (!item.updated_at) return null; // ยังไม่มีคอลัมน์/ข้อมูลเวลา ให้ถือว่าปกติ
  const t = new Date(item.updated_at).getTime();
  return isNaN(t) ? null : Math.max(0, Date.now() - t);
}
function isStale(item) { const a = reportAgeMs(item); return a !== null && a >= REPORT_STALE_MS; }
function ageClass(item) {
  const a = reportAgeMs(item);
  if (a === null || a < REPORT_AGING_MS) return "fresh";
  return a < REPORT_STALE_MS ? "aging" : "stale";
}
function fmtAgoMs(a) {
  const m = Math.floor(a / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  return `${Math.floor(hr / 24)} วันที่แล้ว`;
}
function fmtAgo(item) { const a = reportAgeMs(item); return a === null ? "" : fmtAgoMs(a); }
function fmtAbs(item) { return new Date(item.updated_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }); }

function createBkkIcon(report) {
  const depthText = String(Number(report.water_depth) || 0);
  const statusClass = report.approved === false ? 'bkk-pending' : report.status === 'critical' ? 'bkk-critical' : (report.status === 'warning' ? 'bkk-warning' : 'bkk-normal');

  return L.divIcon({
    className: `bkk-marker ${statusClass} ${report.approved === false ? '' : (ageClass(report) === 'aging' ? 'bkk-aging' : ageClass(report) === 'stale' ? 'bkk-stale' : '')}`,
    html: `<span>${depthText}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -13]
  });
}

// กัน XSS: ข้อความจากฐานข้อมูลต้อง escape ก่อนใส่ใน innerHTML ทุกครั้ง
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getPopupHtml(item) {
  const isCritical = item.status === "critical";
  const isWarning = item.status === "warning";
  const statusColor = isCritical ? "text-rose-600" : (isWarning ? "text-amber-600" : "text-emerald-600");
  const statusBadge = isCritical ? "หนัก" : (isWarning ? "ปานกลาง" : "ปกติ");
  const id = Number(item.id);
  const isPending = item.approved === false;
  const cls = ageClass(item), ago = fmtAgo(item);
  const ageColor = cls === "fresh" ? "text-slate-500" : (cls === "aging" ? "text-amber-600" : "text-rose-600");
  const ageNote = cls === "stale" ? " · ข้อมูลเก่า อาจไม่ตรงสถานการณ์ปัจจุบัน" : (cls === "aging" ? " · ข้อมูลเริ่มเก่า" : "");
  const ageRow = ago
    ? `<div class="text-[11px] ${ageColor} mb-2" title="${esc(fmtAbs(item))}">🕒 อัปเดตล่าสุด${ago.startsWith("เมื่อ") ? "" : " "}${ago}${ageNote}</div>`
    : "";
  const confirmBtn = isPending ? "" : `<button onclick="confirmReport(${id})" class="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors font-medium"><i class="ph-bold ph-arrow-clockwise"></i><span>ยืนยันข้อมูลล่าสุด</span></button>`;
  const pendingBanner = isPending
    ? `<div class="mb-2 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">⏳ รอตรวจสอบ — ยังไม่แสดงต่อสาธารณะ</div>`
    : "";
  const approveBtn = isPending
    ? `<button onclick="approveReport(${id})" class="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors font-medium"><i class="ph-bold ph-check-circle"></i><span>อนุมัติ</span></button>`
    : "";

  return `
    <div class="font-sans text-xs min-w-[220px]">
      ${pendingBanner}
      <h3 class="font-bold text-slate-900 text-sm mb-0.5">${esc(item.title)}</h3>
      <div class="text-[11px] text-slate-500 mb-2">อ.บางระกำ · ต.${esc(item.subdistrict)}</div>

      <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
        <div class="text-slate-500 text-[10px]">ระดับน้ำบนผิวถนน:</div>
        <div class="flex items-baseline gap-1 mt-0.5">
          <span class="text-2xl font-black ${statusColor}">${Number(item.water_depth) || 0}</span>
          <span class="text-xs font-bold text-slate-700">ซม.</span>
          <span class="text-[11px] font-semibold ${statusColor} ml-1">(${statusBadge})</span>
        </div>
      </div>

      ${ageRow}
      <div class="text-[11px] text-slate-600 space-y-0.5 mb-2.5">
        <div><b>การจราจร:</b> ${esc(item.flow_status || "สัญจรได้ปกติ")}</div>
      </div>

      ${isAdmin ? `
      <div class="pt-2 border-t border-slate-100 flex flex-wrap justify-end gap-1">
        ${approveBtn}
        ${confirmBtn}
        <button onclick="updateWaterDepth(${id})" class="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors font-medium">
          <i class="ph-bold ph-pencil-simple"></i>
          <span>แก้ไขระดับน้ำ</span>
        </button>
        <button onclick="deleteReport(${id})" class="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded transition-colors font-medium">
          <i class="ph-bold ph-trash"></i>
          <span>ลบจุดแจ้งเหตุนี้</span>
        </button>
      </div>
      ` : ""}
    </div>
  `;
}

// ==========================================
// 6. RENDER UI & SIDEBAR
// ==========================================
function renderUI(reports) {
  const everything = reports;
  // แอดมินเท่านั้นที่ได้รับรายการรอตรวจสอบจากฐานข้อมูล (RLS) — ตรงนี้แยกออกจากตัวเลขสถิติ
  const pending = isAdmin ? reports.filter(r => r.approved === false) : [];
  reports = reports.filter(r => r.approved !== false);
  markersLayer.clearLayers();
  waterLayer.clearLayers();
  markerRegistry = {};

  let critical = 0, warning = 0, normal = 0, staleCount = 0;
  const subdistrictSet = new Set();

  reports.forEach(item => {
    // ข้อมูลเก่าเกิน 24 ชม. ไม่นับในสถิติ และวงน้ำเหลือแค่เส้นประ เพื่อไม่ให้เข้าใจว่าเป็นสถานการณ์ปัจจุบัน
    const stale = isStale(item);
    if (stale) staleCount++;
    else if (item.status === 'critical') critical++;
    else if (item.status === 'warning') warning++;
    else normal++;

    if (item.water_depth > 0) {
      if (!stale) subdistrictSet.add(item.subdistrict);

      const waterRadius = item.status === 'critical' ? 450 : 250;
      const aging = ageClass(item) === "aging";
      const waterOpacity = stale ? 0 : (item.status === 'critical' ? 0.45 : 0.3) * (aging ? 0.6 : 1);

      L.circle([item.lat, item.lng], {
        radius: waterRadius,
        color: "#0284c7",
        weight: stale ? 1 : 1.5,
        dashArray: stale ? "4 4" : null,
        opacity: stale ? 0.5 : 1,
        fillColor: "#0ea5e9",
        fillOpacity: waterOpacity
      }).addTo(waterLayer);
    }

    const marker = L.marker([item.lat, item.lng], { icon: createBkkIcon(item) });
    marker.bindPopup(getPopupHtml(item));
    markersLayer.addLayer(marker);
    markerRegistry[item.id] = marker;
  });

  pending.forEach(item => {
    const marker = L.marker([item.lat, item.lng], { icon: createBkkIcon(item) });
    marker.bindPopup(getPopupHtml(item));
    markersLayer.addLayer(marker);
    markerRegistry[item.id] = marker;
  });

  const floodedTotal = critical + warning;
  document.getElementById("statTotalFlood").innerText = floodedTotal;
  document.getElementById("statTotalPoints").innerText = reports.length;
  document.getElementById("statNormalPoints").innerText = normal;
  document.getElementById("statSubdistrictsCount").innerText = subdistrictSet.size;
  document.getElementById("statCritical").innerText = `${critical} จุด`;
  document.getElementById("statWarning").innerText = `${warning} จุด`;
  document.getElementById("statMinor").innerText = `${normal} จุด`;
  document.getElementById("statStale").innerText = staleCount;
  document.getElementById("statStaleRow").classList.toggle("hidden", staleCount === 0);
  const mini = document.getElementById("statMini");
  if (mini) mini.innerText = `· ท่วม ${floodedTotal} จุด (หนัก ${critical})`;

  renderSidebar(everything);
}

function buildPendingSection(pending) {
  const wrap = document.createElement("div");
  wrap.className = "border-b-2 border-amber-300 bg-amber-50/60 mb-1";
  wrap.innerHTML = `<div class="px-2.5 py-1.5 text-[11px] font-bold text-amber-800 flex items-center gap-1"><i class="ph-bold ph-hourglass-medium"></i> รอตรวจสอบ (${pending.length})</div>`;
  pending.forEach(item => {
    const id = Number(item.id);
    const div = document.createElement("div");
    div.className = "px-2.5 py-2 hover:bg-amber-100/60 cursor-pointer border-t border-amber-200/70";
    div.innerHTML = `
      <div class="font-bold text-xs text-slate-800 truncate">${esc(item.title)}</div>
      <div class="text-[10px] text-slate-500 truncate">ต.${esc(item.subdistrict)} · ${Number(item.water_depth) || 0} ซม. · ${esc(item.flow_status || "-")}</div>
      <div class="flex gap-1 mt-1">
        <button onclick="event.stopPropagation(); approveReport(${id})" class="text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded">อนุมัติ</button>
        <button onclick="event.stopPropagation(); deleteReport(${id})" class="text-[10px] font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded">ลบ</button>
      </div>`;
    div.addEventListener("click", () => {
      focusMapOnMobile();
        map.flyTo([item.lat, item.lng], 15, { duration: 0.8 });
      setTimeout(() => { if (markerRegistry[item.id]) markerRegistry[item.id].openPopup(); }, 900);
    });
    wrap.appendChild(div);
  });
  return wrap;
}

function renderSidebar(list) {
  const container = document.getElementById("sidebarListContainer");
  const pending = isAdmin ? list.filter(r => r.approved === false) : [];
  const reports = list.filter(r => r.approved !== false);
  container.innerHTML = "";
  document.getElementById("sidebarTotalBadge").innerText = `${reports.length} จุด`;

  if (pending.length > 0) container.appendChild(buildPendingSection(pending));

  if (reports.length === 0) {
    container.insertAdjacentHTML("beforeend", `<div class="p-4 text-center text-xs text-slate-400">ไม่พบจุดตรวจวัดที่ค้นหา</div>`);
    return;
  }

  if (currentViewMode === "subdistrict") {
    const grouped = {};
    reports.forEach(item => {
      if (!grouped[item.subdistrict]) grouped[item.subdistrict] = [];
      grouped[item.subdistrict].push(item);
    });

    Object.keys(grouped).forEach(subdistrictName => {
      const items = grouped[subdistrictName];
      const live = items.filter(i => !isStale(i));
      const allStale = live.length === 0;
      const maxDepth = allStale ? null : Math.max(...live.map(i => i.water_depth));
      const hasCritical = live.some(i => i.status === 'critical');
      const hasWarning = live.some(i => i.status === 'warning');
      const ages = items.map(reportAgeMs).filter(a => a !== null);
      const newestText = ages.length ? ` · ล่าสุด ${fmtAgoMs(Math.min(...ages))}` : "";

      const badgeColor = allStale ? 'bg-slate-100 text-slate-500 border-slate-200' : hasCritical ? 'bg-rose-100 text-rose-700 border-rose-200' : (hasWarning ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200');
      const badgeText = allStale ? 'ข้อมูลเก่า' : hasCritical ? 'หนัก' : (hasWarning ? 'ปานกลาง' : 'ปกติ');

      const div = document.createElement("div");
      div.className = "p-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100";
      
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="font-bold text-xs text-slate-800">${esc(subdistrictName)}</div>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-bold border ${badgeColor}">${badgeText}</span>
        </div>
        <div class="text-[11px] text-slate-500 mt-0.5 truncate">
          ${items.map(i => esc(i.title)).join(", ")}
        </div>
        <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>พบ ${items.length} จุด${newestText}</span>
          <span class="font-bold text-slate-700">${maxDepth === null ? "ไม่มีข้อมูลล่าสุด" : "สูงสุด " + maxDepth + " ซม."}</span>
        </div>
      `;

      div.addEventListener("click", () => {
        const firstItem = items[0];
        focusMapOnMobile();
        map.flyTo([firstItem.lat, firstItem.lng], 14, { duration: 0.8 });
        setTimeout(() => {
          if (markerRegistry[firstItem.id]) {
            markerRegistry[firstItem.id].openPopup();
          }
        }, 900);
      });

      container.appendChild(div);
    });

  } else {
    reports.forEach(item => {
      const div = document.createElement("div");
      div.className = "p-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-100";
      if (isStale(item)) div.classList.add("opacity-60");
      
      const badgeColor = item.status === 'critical' ? 'bg-rose-600' : (item.status === 'warning' ? 'bg-amber-500' : 'border border-emerald-600 text-emerald-700 bg-white');

      div.innerHTML = `
        <div class="flex items-center gap-2 min-w-0 pr-2">
          <div class="w-5 h-5 rounded-full ${badgeColor} text-white font-bold flex items-center justify-center text-[9px] shrink-0">
            ${Number(item.water_depth) || 0}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs text-slate-800 truncate">${esc(item.title)}</div>
            <div class="text-[10px] text-slate-500 truncate">ต.${esc(item.subdistrict)} · ${esc(item.flow_status || 'ปกติ')}${fmtAgo(item) ? ' · ' + fmtAgo(item) : ''}</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-xs font-bold text-slate-700">${item.water_depth > 0 ? item.water_depth + ' ซม.' : 'ปกติ'}</div>
        </div>
      `;

      div.addEventListener("click", () => {
        focusMapOnMobile();
        map.flyTo([item.lat, item.lng], 15, { duration: 0.8 });
        setTimeout(() => {
          if (markerRegistry[item.id]) {
            markerRegistry[item.id].openPopup();
          }
        }, 900);
      });

      container.appendChild(div);
    });
  }
}

const tabSubdistrict = document.getElementById("tabSubdistrict");
const tabRoads = document.getElementById("tabRoads");

tabSubdistrict.addEventListener("click", () => {
  currentViewMode = "subdistrict";
  tabSubdistrict.className = "sidebar-tab px-3 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white";
  tabRoads.className = "sidebar-tab px-3 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-600 hover:bg-slate-300";
  renderSidebar(getFilteredReports());
});

tabRoads.addEventListener("click", () => {
  currentViewMode = "roads";
  tabRoads.className = "sidebar-tab px-3 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white";
  tabSubdistrict.className = "sidebar-tab px-3 py-1 rounded-md text-xs font-semibold bg-slate-200 text-slate-600 hover:bg-slate-300";
  renderSidebar(getFilteredReports());
});

// ==========================================
// 7. การกรองและค้นหา
// ==========================================
const subdistrictFilter = document.getElementById("subdistrictFilter");
const mapSearchInput = document.getElementById("mapSearchInput");

function getFilteredReports() {
  const selectedSub = subdistrictFilter.value;
  const query = mapSearchInput.value.toLowerCase().trim();

  return allReports.filter(item => {
    const matchSub = (selectedSub === "all") || (item.subdistrict === selectedSub);
    const matchQuery = (item.title || '').toLowerCase().includes(query) || (item.subdistrict || '').toLowerCase().includes(query);
    return matchSub && matchQuery;
  });
}

function handleFilterChange() {
  const filtered = getFilteredReports();
  renderUI(filtered);

  const selectedSub = subdistrictFilter.value;
  if (selectedSub !== "all") {
    const matchedZone = subdistrictBoundaries.find(z => z.name === selectedSub);
    if (matchedZone) {
      map.flyToBounds(L.geoJSON(matchedZone.feature).getBounds(), { duration: 1, padding: [30, 30] });
    }
  }
}

subdistrictFilter.addEventListener("change", handleFilterChange);
mapSearchInput.addEventListener("input", handleFilterChange);

// ==========================================
// 8. SUPABASE FETCH & DELETE
// ==========================================
async function fetchReports() {
  const { data, error } = await supabaseClient
    .from("flood_reports")
    .select("*")
    .order("water_depth", { ascending: false });

  if (error) {
    console.error("โหลดข้อมูลไม่สำเร็จ:", error);
    return;
  }
  allReports = data || [];
  renderUI(getFilteredReports());
}

window.deleteReport = async function(id) {
  if (!isAdmin) { alert("ต้องเข้าสู่ระบบแอดมินก่อน"); return; }
  if (!confirm("คุณต้องการลบจุดแจ้งเหตุนี้ใช่หรือไม่?")) return;

  const { data, error } = await supabaseClient
    .from("flood_reports")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    alert("ไม่สามารถลบได้: " + error.message);
  } else if (!data || data.length === 0) {
    alert("ลบไม่สำเร็จ: ไม่มีสิทธิ์หรือไม่พบข้อมูล");
  } else {
    map.closePopup();
    fetchReports();
  }
};

// แอดมินยืนยันว่าสถานการณ์จุดนี้ยังเหมือนเดิม (ฐานข้อมูลจะรีเซ็ตเวลาอัปเดตให้เอง)
window.confirmReport = async function(id) {
  if (!isAdmin) { alert("ต้องเข้าสู่ระบบแอดมินก่อน"); return; }
  const item = allReports.find(r => Number(r.id) === Number(id));
  if (!item) return;
  const { data, error } = await supabaseClient
    .from("flood_reports")
    .update({ water_depth: item.water_depth })
    .eq("id", id)
    .select();
  if (error) {
    alert("ยืนยันไม่สำเร็จ: " + error.message);
  } else if (!data || data.length === 0) {
    alert("ยืนยันไม่สำเร็จ: ไม่มีสิทธิ์หรือไม่พบข้อมูล");
  } else {
    map.closePopup();
    fetchReports();
  }
};

window.approveReport = async function(id) {
  if (!isAdmin) { alert("ต้องเข้าสู่ระบบแอดมินก่อน"); return; }
  const { data, error } = await supabaseClient
    .from("flood_reports")
    .update({ approved: true })
    .eq("id", id)
    .select();

  if (error) {
    alert("อนุมัติไม่สำเร็จ: " + error.message);
  } else if (!data || data.length === 0) {
    alert("อนุมัติไม่สำเร็จ: ไม่มีสิทธิ์หรือไม่พบข้อมูล");
  } else {
    map.closePopup();
    fetchReports();
  }
};

// ==========================================
// 9. REALTIME SUBSCRIPTION
// ==========================================
supabaseClient
  .channel("public:flood_reports")
  .on("postgres_changes", { event: "*", schema: "public", table: "flood_reports" }, () => fetchReports())
  .subscribe();

// ==========================================
// 10. MODAL แจ้งเหตุ
// ==========================================
const modal = document.getElementById("reportModal");
const openBtn = document.getElementById("openReportModalBtn");
const closeBtn = document.getElementById("closeReportModalBtn");
const form = document.getElementById("floodReportForm");

// เกณฑ์ระดับสถานการณ์ (ตรงกับคำอธิบายบนหน้าเว็บ): ≥25 ซม. หนัก / 10–24 ปานกลาง / 0–9 ปกติ
function statusFromDepth(depth) {
  if (depth >= 25) return "critical";
  if (depth >= 10) return "warning";
  return "normal";
}

const reportDepthInput = document.getElementById("reportDepth");
function syncStatusFromDepth() {
  const d = parseInt(reportDepthInput.value, 10);
  const radio = document.querySelector(`input[name="reportStatus"][value="${statusFromDepth(isNaN(d) ? 0 : d)}"]`);
  if (radio) radio.checked = true;
}
reportDepthInput.addEventListener("input", syncStatusFromDepth);

let selectedLat = 16.758;
let selectedLng = 100.117;

function openModal(lat = selectedLat, lng = selectedLng) {
  selectedLat = lat;
  selectedLng = lng;
  document.getElementById("reportLat").value = lat.toFixed(5);
  document.getElementById("reportLng").value = lng.toFixed(5);
  const zoneName = findSubdistrict(lat, lng);
  if (zoneName) document.getElementById("reportSubdistrict").value = zoneName;
  syncStatusFromDepth();
  modal.classList.remove("hidden");
}

openBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
map.on("contextmenu", (e) => openModal(e.latlng.lat, e.latlng.lng));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.innerText = "กำลังบันทึก...";

  const newReport = {
    title: document.getElementById("reportTitle").value,
    subdistrict: document.getElementById("reportSubdistrict").value,
    water_depth: parseInt(document.getElementById("reportDepth").value) || 0,
    status: statusFromDepth(parseInt(document.getElementById("reportDepth").value, 10) || 0),
    flow_status: document.getElementById("reportFlow").value || "ไม่มีรายงานรายละเอียดเพิ่มเติม",
    lat: selectedLat,
    lng: selectedLng,
    approved: isAdmin // ประชาชน = false (รอตรวจสอบ) / แอดมิน = true (แสดงทันที)
  };

  const { error } = await supabaseClient.from("flood_reports").insert([newReport]);
  submitBtn.disabled = false;
  submitBtn.innerText = "บันทึกและส่งรายงาน";

  if (error) {
    alert("บันทึกไม่สำเร็จ: " + error.message);
  } else {
    modal.classList.add("hidden");
    form.reset();
    syncStatusFromDepth();
    fetchReports();
    if (!isAdmin) alert("ส่งรายงานเรียบร้อย ขอบคุณครับ\nเจ้าหน้าที่จะตรวจสอบก่อนแสดงบนแผนที่");
  }
});
  // ฟังก์ชันอัปเดตระดับน้ำจากหน้าเว็บ
window.updateWaterDepth = async function(id) {
  if (!isAdmin) { alert("ต้องเข้าสู่ระบบแอดมินก่อน"); return; }
  const currentDepth = prompt("กรอกระดับน้ำใหม่ (ซม.):");
  if (currentDepth === null || currentDepth.trim() === "" || isNaN(currentDepth) || Number(currentDepth) < 0) return;

  const depth = parseInt(currentDepth);
  const status = statusFromDepth(depth);

  const { data, error } = await supabaseClient
    .from("flood_reports")
    .update({ 
      water_depth: depth,
      status: status
    })
    .eq("id", id)
    .select();

  if (error) {
    alert("อัปเดตไม่สำเร็จ: " + error.message);
  } else if (!data || data.length === 0) {
    alert("อัปเดตไม่สำเร็จ: ไม่มีสิทธิ์หรือไม่พบข้อมูล");
  } else {
    fetchReports(); // ดึงข้อมูลล่าสุดมาแสดงผลใหม่ทันที
  }
};

// ==========================================
// 11. เข้าสู่ระบบแอดมิน (Supabase Auth + ตาราง admins)
// ==========================================
const adminBtn = document.getElementById("adminLoginBtn");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginMsg = document.getElementById("loginMsg");

async function refreshAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  isAdmin = false;
  if (session) {
    const { data, error } = await supabaseClient.rpc("is_admin");
    isAdmin = !error && data === true;
  }
  adminBtn.querySelector("span").innerText = isAdmin ? "ออกจากระบบแอดมิน" : "แอดมิน";
  adminBtn.classList.toggle("bg-emerald-50", isAdmin);
  adminBtn.classList.toggle("text-emerald-700", isAdmin);
  renderSiteStatus();
  map.closePopup();
  fetchReports();
}

adminBtn.addEventListener("click", async () => {
  if (isAdmin) {
    await supabaseClient.auth.signOut();
    return;
  }
  loginMsg.innerText = "";
  loginModal.classList.remove("hidden");
});
document.getElementById("closeLoginBtn").addEventListener("click", () => loginModal.classList.add("hidden"));

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.innerText = "กำลังเข้าสู่ระบบ...";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value
  });
  if (error) { loginMsg.innerText = "เข้าสู่ระบบไม่สำเร็จ: " + error.message; return; }

  await refreshAdmin();
  if (!isAdmin) {
    await supabaseClient.auth.signOut();
    loginMsg.innerText = "บัญชีนี้ไม่มีสิทธิ์แอดมิน";
    return;
  }
  loginForm.reset();
  loginModal.classList.add("hidden");
});

// ห้ามเรียก supabase ตรงๆ ใน callback นี้ (เสี่ยง deadlock) จึงใช้ setTimeout
supabaseClient.auth.onAuthStateChange(() => setTimeout(refreshAdmin, 0));

// ==========================================
// 12. การ์ดสถานะ บางระกำโมเดล / Y.16 (แอดมินกรอกเอง)
// ==========================================
const STALE_MS = 24 * 60 * 60 * 1000; // เก่าเกิน 24 ชม. = ยังไม่มีข้อมูล
const SITE_CARDS = {
  bangrakam_model: {
    prefix: "model", title: "บางระกำโมเดล (กักเก็บน้ำในทุ่ง)",
    presets: ["พร้อมรับน้ำ", "กำลังรับน้ำ", "ใกล้เต็มความจุ", "เต็มความจุ"]
  },
  y16: {
    prefix: "y16", title: "สถานีวัดน้ำแม่น้ำยม Y.16",
    presets: ["ปกติ", "เฝ้าระวังเอ่อล้น", "ใกล้ล้นตลิ่ง", "ล้นตลิ่ง"]
  }
};
const LEVEL_TEXT = { ok: "text-emerald-600", watch: "text-amber-600", alert: "text-rose-600" };
let siteStatus = {};
let editingStatusKey = null;

function fmtTime(iso) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

function renderSiteStatus() {
  Object.entries(SITE_CARDS).forEach(([key, cfg]) => {
    const row = siteStatus[key];
    const fresh = !!(row && row.label && row.updated_at && Date.now() - new Date(row.updated_at).getTime() < STALE_MS);

    const labelEl = document.getElementById(cfg.prefix + "Label");
    labelEl.textContent = fresh ? row.label : "ยังไม่มีข้อมูล";
    labelEl.className = fresh ? (LEVEL_TEXT[row.level] || "text-slate-700") : "text-slate-400";

    // ใช้ textContent ทั้งหมด: ข้อความที่แอดมินกรอกจึงไม่ถูกตีความเป็น HTML
    document.getElementById(cfg.prefix + "Detail").textContent = fresh && row.detail ? row.detail : "";
    document.getElementById(cfg.prefix + "Updated").textContent =
      row && row.label && row.updated_at
        ? (fresh ? "อัปเดต " : "ข้อมูลเก่า · อัปเดตล่าสุด ") + fmtTime(row.updated_at)
        : "รอเจ้าหน้าที่กรอกข้อมูล";
  });
  document.querySelectorAll("[data-edit-status]").forEach(btn => btn.classList.toggle("hidden", !isAdmin));
}

async function fetchSiteStatus() {
  const { data, error } = await supabaseClient.from("site_status").select("*");
  if (error) {
    console.error("โหลดสถานะไม่สำเร็จ:", error);
  } else {
    siteStatus = Object.fromEntries((data || []).map(r => [r.key, r]));
  }
  renderSiteStatus();
}

const statusModal = document.getElementById("statusModal");
const statusForm = document.getElementById("statusForm");
const statusMsg = document.getElementById("statusMsg");

function openStatusModal(key) {
  if (!isAdmin) return;
  editingStatusKey = key;
  const cfg = SITE_CARDS[key], row = siteStatus[key] || {};
  document.getElementById("statusModalTitle").innerText = "แก้ไข: " + cfg.title;
  document.getElementById("statusLabel").value = row.label || "";
  document.getElementById("statusLevel").value = row.level || "ok";
  document.getElementById("statusDetail").value = row.detail || "";
  const list = document.getElementById("statusLabelOptions");
  list.innerHTML = "";
  cfg.presets.forEach(p => { const o = document.createElement("option"); o.value = p; list.appendChild(o); });
  statusMsg.innerText = "";
  statusModal.classList.remove("hidden");
}

async function saveStatus(values) {
  if (!isAdmin || !editingStatusKey) return;
  statusMsg.innerText = "กำลังบันทึก...";
  const { data, error } = await supabaseClient
    .from("site_status").update(values).eq("key", editingStatusKey).select();
  if (error) { statusMsg.innerText = "บันทึกไม่สำเร็จ: " + error.message; return; }
  if (!data || data.length === 0) { statusMsg.innerText = "บันทึกไม่สำเร็จ: ไม่มีสิทธิ์หรือยังไม่ได้รัน site_status.sql"; return; }
  statusModal.classList.add("hidden");
  fetchSiteStatus();
}

document.querySelectorAll("[data-edit-status]").forEach(btn =>
  btn.addEventListener("click", () => openStatusModal(btn.dataset.editStatus)));
document.getElementById("closeStatusBtn").addEventListener("click", () => statusModal.classList.add("hidden"));
statusForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveStatus({
    label: document.getElementById("statusLabel").value.trim(),
    level: document.getElementById("statusLevel").value,
    detail: document.getElementById("statusDetail").value.trim() || null
  });
});
document.getElementById("clearStatusBtn").addEventListener("click", () => {
  if (confirm("ล้างข้อมูลการ์ดนี้ให้แสดง \"ยังไม่มีข้อมูล\" ใช่หรือไม่?")) saveStatus({ label: null, detail: null });
});

supabaseClient
  .channel("public:site_status")
  .on("postgres_changes", { event: "*", schema: "public", table: "site_status" }, () => fetchSiteStatus())
  .subscribe();

setInterval(renderSiteStatus, 5 * 60 * 1000); // ให้การ์ดเปลี่ยนเป็น "ยังไม่มีข้อมูล" เองเมื่อข้อมูลเก่าเกิน 24 ชม.

// ==========================================
// 13. รองรับมือถือ
// ==========================================
const isMobile = () => window.innerWidth < 768;

// บนมือถือรายการอยู่ใต้แผนที่ — กดแล้วเลื่อนกลับขึ้นไปดูแผนที่
function focusMapOnMobile() {
  if (isMobile()) document.getElementById("mapContainer").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ส่วนสรุปด้านบนพับเก็บได้ (เริ่มต้นพับบนมือถือเพื่อให้เห็นแผนที่เร็ว)
const dashGrid = document.getElementById("dashGrid");
const dashToggle = document.getElementById("dashToggle");
dashToggle.addEventListener("click", () => {
  const open = dashGrid.classList.contains("grid");
  dashGrid.classList.toggle("grid", !open);
  dashGrid.classList.toggle("hidden", open);
  document.getElementById("dashToggleText").innerText = open ? "แสดงรายละเอียด" : "ซ่อนรายละเอียด";
  document.getElementById("dashToggleIcon").className = open ? "ph-bold ph-caret-down" : "ph-bold ph-caret-up";
});

// หมุนจอ/ปรับขนาดแล้วแผนที่ต้องคำนวณขนาดใหม่
window.addEventListener("resize", () => map.invalidateSize());
window.addEventListener("orientationchange", () => setTimeout(() => map.invalidateSize(), 300));

// ==========================================
// 14. เบอร์ฉุกเฉิน
// ==========================================
// เบอร์สายด่วนระดับประเทศที่ใช้เหมือนกันทั่วประเทศ
const NATIONAL_CONTACTS = [
  { name: "กรมป้องกันและบรรเทาสาธารณภัย (ปภ.)", desc: "แจ้งเหตุสาธารณภัย ขอความช่วยเหลือ", tel: "1784" },
  { name: "บริการแพทย์ฉุกเฉิน (สพฉ.)", desc: "เจ็บป่วยฉุกเฉิน ขอรถพยาบาล", tel: "1669" },
  { name: "ตำรวจ", desc: "เหตุด่วนเหตุร้าย", tel: "191" },
  { name: "ศูนย์ความปลอดภัย กรมทางหลวงชนบท", desc: "สอบถามเส้นทางน้ำท่วม / ถนนชนบท", tel: "1146" },
  { name: "กรมชลประทาน", desc: "ข้อมูลสถานการณ์น้ำ-เขื่อน", tel: "1460" },
  { name: "กรมอุตุนิยมวิทยา", desc: "สภาพอากาศ พยากรณ์ฝน", tel: "1182" },
  { name: "การไฟฟ้าส่วนภูมิภาค (กฟภ.)", desc: "ไฟฟ้าขัดข้อง ไฟรั่ว", tel: "1129" }
];

// ▼ เติมเบอร์หน่วยงานในพื้นที่จริงที่นี่ (ตรวจสอบเบอร์กับหน่วยงานก่อนใส่) — ถ้าเว้นว่างจะไม่แสดงส่วนนี้
// ตัวอย่างรูปแบบ: { name: "ที่ว่าการอำเภอบางระกำ", desc: "ศูนย์บรรเทาสาธารณภัยอำเภอ", tel: "055-000000" }
const LOCAL_CONTACTS = [];

function contactRow(c) {
  const tel = String(c.tel).replace(/[^0-9+]/g, "");
  return `
    <a href="tel:${esc(tel)}" class="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
      <div class="min-w-0">
        <div class="text-xs font-bold text-slate-800">${esc(c.name)}</div>
        <div class="text-[11px] text-slate-500">${esc(c.desc || "")}</div>
      </div>
      <span class="shrink-0 flex items-center gap-1 text-sm font-black text-rose-600"><i class="ph-bold ph-phone"></i>${esc(c.tel)}</span>
    </a>`;
}

(function initContacts() {
  document.getElementById("nationalContacts").innerHTML = NATIONAL_CONTACTS.map(contactRow).join("");
  if (LOCAL_CONTACTS.length > 0) {
    const box = document.getElementById("localContacts");
    box.innerHTML = `<div class="text-xs font-bold text-slate-700 mb-1">หน่วยงานในพื้นที่ อ.บางระกำ</div>
      <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">${LOCAL_CONTACTS.map(contactRow).join("")}</div>`;
    box.classList.remove("hidden");
  }
  const contactModal = document.getElementById("contactModal");
  document.getElementById("openContactBtn").addEventListener("click", () => contactModal.classList.remove("hidden"));
  document.getElementById("closeContactBtn").addEventListener("click", () => contactModal.classList.add("hidden"));
  contactModal.addEventListener("click", (e) => { if (e.target === contactModal) contactModal.classList.add("hidden"); });
})();

// ให้ความจาง/อายุของจุดอัปเดตเองทุก 5 นาที (ข้ามรอบถ้ากำลังเปิดป๊อปอัปอยู่ เพื่อไม่ให้ป๊อปอัปปิดเอง)
let popupOpen = false;
map.on("popupopen", () => { popupOpen = true; });
map.on("popupclose", () => { popupOpen = false; });
setInterval(() => { if (!popupOpen) renderUI(getFilteredReports()); }, 5 * 60 * 1000);

// เริ่มดึงข้อมูล
fetchReports();
refreshAdmin();
fetchSiteStatus();