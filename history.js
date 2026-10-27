// ==========================================
// เหตุการณ์น้ำท่วม อ.บางระกำ ย้อนหลัง (ข้อมูลจากข่าวและรายงานหน่วยงาน)
// หมายเหตุ: ไม่มีพิกัดรายจุด — ถ้าข่าวระบุชื่อตำบลจะไฮไลต์ตำบลนั้น ถ้าไม่ระบุจะแสดงเป็นระดับอำเภอ
// เพิ่มเหตุการณ์ใหม่โดยเติมรายการใน FLOOD_HISTORY (เรียงใหม่ → เก่า) และใส่ลิงก์ที่มาเสมอ
// ==========================================
const FLOOD_HISTORY = [
  {
    id: "2569-10", year: 2569, period: "ต.ค. 2569", kind: "น้ำท่วมขัง",
    title: "น้ำท่วม 3 ตำบล 5 หมู่บ้าน",
    summary: "ปภ.รายงานน้ำท่วมใน อ.บางระกำ 3 ตำบล 5 หมู่บ้าน กระทบ 63 ครัวเรือนเมื่อ 12 ต.ค. และลดเหลือ 45 ครัวเรือนในช่วง 22–27 ต.ค. ระดับน้ำลดลง",
    tambons: [], note: "รายงานไม่ระบุชื่อตำบล จึงแสดงเป็นระดับอำเภอ",
    sources: [
      { name: "Thai PBS (12 ต.ค.)", url: "https://www.thaipbs.or.th/news/content/570856" },
      { name: "เดลินิวส์ (27 ต.ค.)", url: "https://dailynews.co.th/news/6307740" }
    ]
  },
  {
    id: "2568-11", year: 2568, period: "พ.ย. 2568", kind: "น้ำท่วมชุมชน",
    title: "อิทธิพลพายุคัลแมกี น้ำเข้าทุ่งบางระกำ",
    summary: "ฝนหนักช่วง 7–9 พ.ย. ร่วมกับน้ำเหนือและน้ำจากสุโขทัยไหลเข้าพื้นที่บางระกำโมเดล ชุมชนใน อ.บางระกำถูกน้ำท่วมสูง ณ 17 พ.ย. คาดเหลือน้ำในทุ่งราว 100 ล้าน ลบ.ม. ภายใน 30 พ.ย.",
    tambons: [], note: "รายงานไม่ระบุชื่อตำบล จึงแสดงเป็นระดับอำเภอ",
    sources: [{ name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/358590" }]
  },
  {
    id: "2568-09", year: 2568, period: "ก.ย. 2568", kind: "ทุ่งรับน้ำเกินความจุ",
    title: "ทุ่งบางระกำกักน้ำเกินความจุ",
    summary: "ณ 25 ก.ย. 2568 ทุ่งบางระกำกักน้ำไว้ 449 ล้าน ลบ.ม. เกินความจุ 400 ล้าน ลบ.ม. (ราว 112%)",
    tambons: [], note: "ตัวเลขเป็นระดับทุ่งรับน้ำ ไม่ระบุตำบล",
    sources: [{ name: "Phitsanulok Hotnews", url: "https://www.phitsanulokhotnews.com/2025/09/25/191109" }]
  },
  {
    id: "2568-07", year: 2568, period: "ก.ค. 2568", kind: "เตือนน้ำยมล้นตลิ่ง",
    title: "น้ำยมมีแนวโน้มล้นตลิ่ง",
    summary: "ปภ.และจังหวัดพิษณุโลกแจ้งเตือนว่าน้ำยมเพิ่มขึ้นต่อเนื่อง คาดกระทบ อ.บางระกำตั้งแต่ 27 ก.ค. 2568 เวลา 06.00 น. และมีรายงานเหตุน้ำท่วมพิษณุโลกวันที่ 29 ก.ค. ที่ระบุบางระกำเป็นพื้นที่ได้รับผลกระทบ",
    tambons: [], note: "เป็นประกาศเตือนระดับอำเภอ ไม่ระบุตำบล",
    sources: [
      { name: "GCC1111", url: "https://x.com/GCC_1111/status/1949033761909477742" },
      { name: "AHA Centre", url: "https://adinet.ahacentre.org/report/thailand-flooding-in-phitsanulok-20250729" }
    ]
  },
  {
    id: "2567-08", year: 2567, period: "ส.ค.–ก.ย. 2567", kind: "ระบายน้ำเข้าทุ่งรับน้ำ",
    title: "เปิดระบายน้ำเข้าทุ่งบางระกำโมเดล",
    summary: "28 ส.ค. 2567 กรมชลประทานเปิดระบายน้ำจากคลองแยงมุมเข้าทุ่งบางระกำเพื่อหน่วงน้ำ คาดน้ำเต็มทุ่งในราว 1 เดือน ภาพดาวเทียม GISTDA วันที่ 15 ก.ย. พบน้ำท่วมขังบางส่วนของพิษณุโลก (ไม่ได้ระบุเฉพาะบางระกำ)",
    tambons: [], note: "ข้อมูลระดับทุ่งรับน้ำ/จังหวัด ไม่ระบุตำบล",
    sources: [
      { name: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/343575" },
      { name: "GISTDA 15 ก.ย. 2567", url: "https://www.thaiwater.net/uploads/contents/current/2024/FloodChiangrai_Sep2024/img_FloodChiangrai_Sep2024/gistda_20240915_ALOS2_20240915_0026.pdf" }
    ]
  },
  {
    id: "2566-10", year: 2566, period: "ต.ค. 2566", kind: "น้ำท่วมซ้ำซาก",
    title: "ต.ชุมแสงสงคราม น้ำท่วมซ้ำซาก",
    summary: "มีรายงานว่า ต.ชุมแสงสงครามถูกน้ำท่วมซ้ำซากเป็นประจำทุกปี และนายกรัฐมนตรีลงพื้นที่พิษณุโลกติดตามสถานการณ์น้ำเมื่อ 14 ต.ค. 2566",
    tambons: ["ชุมแสงสงคราม"], note: "ข่าวไม่ได้ระบุระดับน้ำหรือจำนวนผู้ได้รับผลกระทบ",
    sources: [
      { name: "MGR Online", url: "https://mgronline.com/local/detail/9660000091211" },
      { name: "แนวหน้า", url: "https://www.naewna.com/local/762890" }
    ]
  },
  {
    id: "2565-10", year: 2565, period: "ต.ค. 2565", kind: "น้ำท่วมขัง",
    title: "น้ำท่วม 6 ตำบล 26 หมู่บ้าน",
    summary: "ณ 13 ต.ค. 2565 อ.บางระกำเสียหาย 6 ตำบล 26 หมู่บ้าน 1,072 ครัวเรือน พื้นที่เกษตรเสียหาย 1,551 ไร่",
    tambons: [], note: "รายงานไม่ระบุชื่อตำบล จึงแสดงเป็นระดับอำเภอ",
    sources: [{ name: "ไทยโพสต์", url: "https://www.thaipost.net/district-news/241960/" }]
  }
];

const HISTORY_YEARS = [2569, 2568, 2567, 2566, 2565];
let historyYear = "all";
const historyLayer = L.layerGroup().addTo(map);

function ceYear(be) { return be - 543; }

function renderHistoryYears() {
  const box = document.getElementById("historyYears");
  const items = [["all", "ทั้งหมด"], ...HISTORY_YEARS.map(y => [y, `${y} (${ceYear(y)})`])];
  box.innerHTML = items.map(([v, label]) => {
    const on = String(v) === String(historyYear);
    return `<button type="button" data-year="${esc(v)}" class="px-2.5 py-1 rounded-md text-xs font-semibold ${on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}">${esc(label)}</button>`;
  }).join("");
  box.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    historyYear = b.dataset.year === "all" ? "all" : Number(b.dataset.year);
    renderHistoryYears();
    renderHistoryList();
  }));
}

function renderHistoryList() {
  const list = document.getElementById("historyList");
  const items = FLOOD_HISTORY.filter(e => historyYear === "all" || e.year === historyYear);
  list.innerHTML = "";
  items.forEach(ev => {
    const where = ev.tambons.length ? "ต." + ev.tambons.join(", ต.") : "ระดับอำเภอ (ไม่ระบุตำบล)";
    const div = document.createElement("button");
    div.type = "button";
    div.className = "w-full text-left p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50";
    div.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-xs text-slate-800">${esc(ev.period)} · ${esc(ev.title)}</span>
        <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">${esc(ev.kind)}</span>
      </div>
      <div class="text-[11px] text-slate-500 mt-0.5">${esc(where)}</div>`;
    div.addEventListener("click", () => {
      document.getElementById("historyModal").classList.add("hidden");
      showHistoryOnMap(ev);
    });
    list.appendChild(div);
  });
  if (items.length === 0) list.innerHTML = `<div class="text-xs text-slate-400 p-3 text-center">ไม่พบเหตุการณ์ในช่วงเวลานี้</div>`;
}

function clearHistory() {
  historyLayer.clearLayers();
  document.getElementById("historyBanner").classList.add("hidden");
}

function showHistoryOnMap(ev) {
  historyLayer.clearLayers();
  const known = ev.tambons.length > 0;
  const zones = known
    ? subdistrictBoundaries.filter(z => ev.tambons.includes(z.name))
    : subdistrictBoundaries;

  const group = L.featureGroup();
  zones.forEach(z => {
    L.geoJSON(z.feature, {
      style: known
        ? { color: "#0369a1", weight: 3, fillColor: "#0ea5e9", fillOpacity: 0.35 }
        : { color: "#0369a1", weight: 2, dashArray: "6 6", fillColor: "#0ea5e9", fillOpacity: 0.1 }
    }).addTo(group);
  });
  const pts = known ? zones.map(z => z.center) : [BANG_RAKAM_CENTER];
  pts.forEach(c => {
    L.marker(c, {
      icon: L.divIcon({
        className: "bkk-marker bkk-warning",
        html: `<span><i class="ph-bold ph-clock-counter-clockwise"></i></span>`,
        iconSize: [26, 26], iconAnchor: [13, 13]
      })
    }).bindPopup(`<div class="font-sans text-xs"><b>${esc(ev.period)}</b><br>${esc(ev.title)}<br><span class="text-slate-500">${esc(ev.note)}</span></div>`).addTo(group);
  });
  group.addTo(historyLayer);
  if (zones.length) map.flyToBounds(group.getBounds(), { duration: 1, padding: [30, 30] });

  const banner = document.getElementById("historyBanner");
  banner.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="text-[10px] font-bold text-sky-700">เหตุการณ์ย้อนหลัง · ${esc(ev.period)}</div>
        <div class="font-bold text-sm text-slate-900">${esc(ev.title)}</div>
      </div>
      <button type="button" id="historyCloseBtn" class="shrink-0 text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x"></i></button>
    </div>
    <p class="text-[11px] text-slate-600 mt-1.5">${esc(ev.summary)}</p>
    <p class="text-[10px] text-amber-700 mt-1.5">⚠ ${esc(ev.note)} · ไม่ใช่สถานการณ์ปัจจุบัน และไม่ใช่ขอบเขตน้ำท่วมจริง</p>
    <div class="text-[10px] text-slate-500 mt-1.5">ที่มา: ${ev.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${esc(s.name)}</a>`).join(" · ")}</div>`;
  banner.classList.remove("hidden");
  document.getElementById("historyCloseBtn").addEventListener("click", clearHistory);
  if (typeof focusMapOnMobile === "function") focusMapOnMobile();
}

(function initHistory() {
  const modal = document.getElementById("historyModal");
  document.getElementById("openHistoryBtn").addEventListener("click", () => {
    renderHistoryYears();
    renderHistoryList();
    modal.classList.remove("hidden");
  });
  document.getElementById("closeHistoryBtn").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
})();