/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Fix: Add declare for Leaflet to avoid 'L' is not defined errors.
declare var L: any;

// Fix: Add types for DOM elements
const latEl = document.getElementById('lat') as HTMLInputElement,
      lonEl = document.getElementById('lon') as HTMLInputElement;
const latDir = document.getElementById('latDir') as HTMLSelectElement,
      lonDir = document.getElementById('lonDir') as HTMLSelectElement;
const satLonEl = document.getElementById('satLon') as HTMLInputElement,
      satLonDir = document.getElementById('satLonDir') as HTMLSelectElement;
const headingEl = document.getElementById('heading') as HTMLInputElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement,
      copyBtn = document.getElementById('copyBtn') as HTMLButtonElement,
      pdfBtn = document.getElementById('pdfBtn') as HTMLButtonElement;
const azVal=document.getElementById('azVal'), elVal=document.getElementById('elVal'), relVal=document.getElementById('relVal');
const zonesTable=document.getElementById("zonesTable");
const zonesBody=document.getElementById("zonesBody");
const addBlockBtn=document.getElementById("addBlockBtn");
const satRangesList=document.getElementById("satRangesList");
const MIN_ELEVATION = 5;
const zoneColors = [
  "rgba(255, 0, 0, 0.5)",
  "rgba(0, 128, 255, 0.5)",
  "rgba(0, 200, 0, 0.5)",
  "rgba(255, 165, 0, 0.5)",
  "rgba(128, 0, 128, 0.5)",
  "rgba(255, 20, 147, 0.5)"
];
const beamDetailsEl = document.getElementById('beamDetails');
const visibleSatellitesList = document.getElementById('visibleSatellites');
const blockedSatellitesList = document.getElementById('blockedSatellites');

// New Trim table elements
const azGreenEl = document.getElementById('azGreen') as HTMLInputElement;
const azCurrentEl = document.getElementById('azCurrent') as HTMLInputElement;
const azNewEl = document.getElementById('azNew') as HTMLInputElement;
const elGreenEl = document.getElementById('elGreen') as HTMLInputElement;
const elCurrentEl = document.getElementById('elCurrent') as HTMLInputElement;
const elNewEl = document.getElementById('elNew') as HTMLInputElement;

function formatNumber(num) {
  return (Math.round(num * 100) / 100).toString().replace(/\.00$/, "");
}
// Fix: Add type annotation for canvas parameter to allow access to width/height
function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
}
function adjustGraphHeight() {
  // Fix: Cast canvas to HTMLCanvasElement to allow access to width/height
  const canvas = document.getElementById("elGraph") as HTMLCanvasElement;
  const table = document.getElementById("zonesTable");
  if (!canvas || !table) return;
  const rowCount = table.querySelectorAll("tbody tr").length;
  const baseHeight = 200;
  const extraPerRow = 25;
  const newHeight = baseHeight + rowCount * extraPerRow;
  canvas.style.height = newHeight + "px";
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = newHeight * 2;
}

function drawElGraph(lat, lon) {
// Fix: Cast canvas to HTMLCanvasElement and check for null
const canvas = document.getElementById("elGraph") as HTMLCanvasElement;
if (!canvas) return;
resizeCanvas(canvas);
// Fix: Check if context is available
const ctx = canvas.getContext("2d");
if (!ctx) return;

const margin = 40;
const width = canvas.width - 2 * margin;
const height = canvas.height - 2 * margin;
const MIN_ELEVATION = 5;

const step = 0.5;
let visibleLons = [];
for (let lonSat = -180; lonSat <= 180; lonSat += step) {
const { el: testEl } = calcAzEl(lat, lon, lonSat);
if (testEl > MIN_ELEVATION) visibleLons.push(lonSat);
}
let minVisible = -180, maxVisible = 180;
if (visibleLons.length > 0) {
minVisible = Math.min(...visibleLons) - 5;
maxVisible = Math.max(...visibleLons) + 5;
if (minVisible < -180) minVisible = -180;
if (maxVisible > 180) maxVisible = 180;
}

function toX(lonSat) {
return margin + (lonSat - minVisible) * (width / (maxVisible - minVisible));
}
function toY(el) {
const clampedEl = Math.max(0, el);
return canvas.height - margin - (clampedEl / 90) * height;
}
function normalizeLon(lon) {
return ((lon + 180) % 360 + 360) % 360 - 180;
}

ctx.clearRect(0, 0, canvas.width, canvas.height);

function shadeBand(elMin, elMax, color) {
const top = toY(elMax);
const bottom = toY(elMin);
ctx.fillStyle = color;
ctx.globalAlpha = 0.2;
ctx.fillRect(toX(minVisible), top, toX(maxVisible) - toX(minVisible), bottom - top);
ctx.globalAlpha = 1.0;
}
shadeBand(0, MIN_ELEVATION, "red");
shadeBand(MIN_ELEVATION, 15, "yellow");
shadeBand(15, 65, "green");
shadeBand(65, 80, "yellow");
shadeBand(80, 90, "red");

const { heading } = getLatLon();
const rows = Array.from(zonesBody.querySelectorAll('tr'));
if (rows.length > 0) {
ctx.globalAlpha = 0.25;
rows.forEach((row, idx) => {
const startAZ = parseFloat(row.cells[0].querySelector("input").value);
const stopAZ  = parseFloat(row.cells[1].querySelector("input").value);
const elBlock  = parseFloat(row.cells[2].querySelector("input").value);
if (isNaN(startAZ) || isNaN(stopAZ) || isNaN(elBlock)) return;

const ranges = computeSatRangesForZone(startAZ, stopAZ, lat, lon, heading, 0.5);
ctx.fillStyle = zoneColors[idx % zoneColors.length];

ranges.forEach(([startLon, endLon]) => {
  const top = toY(elBlock);
  const bottom = toY(0);
  ctx.fillRect(toX(startLon), top, toX(endLon) - toX(startLon), bottom - top);
});
});
ctx.globalAlpha = 1.0;
}

ctx.strokeStyle = "black";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(toX(minVisible), toY(0));
ctx.lineTo(toX(maxVisible), toY(0));
ctx.moveTo(toX(minVisible), toY(0));
ctx.lineTo(toX(minVisible), toY(90));
ctx.stroke();

ctx.fillStyle = "black";
ctx.font = "20px sans-serif";
ctx.textAlign = "center";

const tickStep = 30;
for (let lon = Math.ceil(minVisible / tickStep) * tickStep; lon <= maxVisible; lon += tickStep) {
const x = toX(lon);
ctx.beginPath();
ctx.moveTo(x, toY(0));
ctx.lineTo(x, toY(0) + 5);
ctx.stroke();
let label;
if (lon < 0) {
  label = `${Math.abs(lon)}°W`;
} else if (lon > 0) {
  label = `${lon}°E`;
} else {
  label = `0°`;
}
ctx.fillText(label, x, toY(0) + 15);
}

ctx.fillStyle = "black";
ctx.font = "18px sans-serif";
ctx.textAlign = "center";

ctx.fillText(
formatLonEW(Math.round(minVisible)),
toX(minVisible),
toY(0) + 30
);

ctx.fillText(
formatLonEW(Math.round(maxVisible)),
toX(maxVisible),
toY(0) + 30
);
ctx.textAlign = "right";
for (let el = 0; el <= 90; el += 15) {
const y = toY(el);
ctx.beginPath();
ctx.moveTo(toX(minVisible), y);
ctx.lineTo(toX(minVisible) - 5, y);
ctx.stroke();
ctx.fillText(el.toString(), toX(minVisible) - 8, y + 3);
}

const satLons = [];
const elevations = [];
const satLonStep = 1;
for (let lonSat = minVisible; lonSat <= maxVisible; lonSat += satLonStep) {
const { el } = calcAzEl(lat, lon, lonSat);
satLons.push(lonSat);
elevations.push(el);
}
ctx.strokeStyle = "blue";
ctx.lineWidth = 2;
ctx.beginPath();
satLons.forEach((lonSat, i) => {
const x = toX(lonSat);
const y = toY(elevations[i]);
if (i === 0) ctx.moveTo(x, y);
else ctx.lineTo(x, y);
});
ctx.stroke();

ctx.strokeStyle = "red";
ctx.setLineDash([5, 3]);
ctx.beginPath();
ctx.moveTo(toX(minVisible), toY(MIN_ELEVATION));
ctx.lineTo(toX(maxVisible), toY(MIN_ELEVATION));
ctx.stroke();
ctx.setLineDash([]);

let { satLon } = getLatLon();
satLon = normalizeLon(satLon);
if (satLon >= minVisible && satLon <= maxVisible) {
ctx.strokeStyle = "purple";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(toX(satLon), toY(0));
ctx.lineTo(toX(satLon), toY(90));
ctx.stroke();

ctx.fillStyle = "purple";
ctx.font = "22px sans-serif";
ctx.textAlign = "center";
ctx.fillText(formatLonEW(satLon), toX(satLon), canvas.height - margin + 28);

const { el: satEl } = calcAzEl(lat, lon, satLon);
ctx.beginPath();
ctx.arc(toX(satLon), toY(satEl), 4, 0, 2 * Math.PI);
ctx.fill();
ctx.fillText(`${satEl.toFixed(1)}°`, toX(satLon), toY(satEl) - 8);
}
}

function formatLonEW(lon) {
  if (lon > 0) return formatNumber(lon) + "°E";
  if (lon < 0) return formatNumber(Math.abs(lon)) + "°W";
  return "0°";
}
function checkBlockingZones(rel, el) {
const rows = zonesBody.querySelectorAll("tr");
const matches = [];
let zoneIndex = 0;

for (const row of rows) {
zoneIndex++;
const start = parseFloat(row.cells[0].querySelector("input").value);
const stop  = parseFloat(row.cells[1].querySelector("input").value);
const elBlock  = parseFloat(row.cells[2].querySelector("input").value);

if (isNaN(start) || isNaN(stop) || isNaN(elBlock)) continue;

let startAZ = (start + 360) % 360;
let stopAZ = (stop + 360) % 360;
let inZone = false;

if (startAZ <= stopAZ) {
  inZone = (rel >= startAZ && rel <= stopAZ);
} else {
  inZone = (rel >= startAZ || rel <= stopAZ);
}

if (inZone && el < elBlock) {
  matches.push({ index: zoneIndex, start, stop, elBlock });
}
}
return matches.length ? matches : null;
}

function createZoneRow(start = 0.00, stop = 0.00, elBlock = 10) {
if (zonesTable.classList.contains("narrow-table") === false) {
    zonesTable.classList.add("narrow-table");
}
const tr = document.createElement("tr");
const rowIndex = zonesBody.children.length;
const color = zoneColors[rowIndex % zoneColors.length].replace("0.5", "1.0");

tr.innerHTML = `
<td><span style="color:${color};">&#9679;</span><input type="text" inputmode="decimal" value="${formatNumber(start)}"></td>
<td><input type="text" inputmode="decimal" value="${formatNumber(stop)}"></td>
<td><input type="text" inputmode="decimal" value="${formatNumber(elBlock)}"></td>
<td><button class="small secondary" data-html2canvas-ignore="true">X</button></td>
`;

const inputs = tr.querySelectorAll("input");
inputs.forEach(inp => {
inp.addEventListener("input", updateAll);
inp.addEventListener("blur", () => {
  let val = (inp.value || "").trim().replace(",", ".");
  let num = parseFloat(val);
  if (isNaN(num)) num = 0;
  if (inp === inputs[2]) {
    if (num < 0) num = 0;
    if (num > 90) num = 90;
  } else {
    if (num < 0) num = 0;
    if (num > 360) num = 360;
  }
  inp.value = formatNumber(num);
  updateAll();
});
// Fix: Cast event target to HTMLInputElement to use select()
inp.addEventListener("focus", e => setTimeout(() => (e.target as HTMLInputElement).select(), 0));
});

tr.querySelector("button").addEventListener("click", () => {
tr.remove();
if (zonesBody.children.length === 0) zonesTable.style.display = "none";
setupKeyboardNavigation();
updateAll();
});

zonesBody.appendChild(tr);
zonesTable.style.display = "table";
setupKeyboardNavigation();
updateAll();
}
addBlockBtn.addEventListener("click", () => createZoneRow());

// --- MODIFIED FUNCTION: normalizeInput for 0-180 E/W enforcement ---
function normalizeInput(input: HTMLInputElement, max) {
    let val = (input.value || "").trim().replace(",", ".");
    if (val === "") return;
    let num = parseFloat(val);
    if (isNaN(num)) return;

    if (input.id === "azCurrent" || input.id === "elCurrent") {
        input.value = Math.round(num).toString();
    } else if (input.id === "azGreen" || input.id === "elGreen") {
        input.value = formatNumber(num);
    } else if (input.id === "heading") {
        if (num < 0) num = 0;
        if (num > 360) num = 360;
        input.value = formatNumber(num);
    } else if (input.id === "lat") {
        if (num < 0) num = 0;
        if (num > 90) num = 90; // Latitude limit
        input.value = formatNumber(num);
    } else {
        // Longitude/SatLon normalization (0 to 180 E/W)
        let dirSelect = input.id === "lon" ? lonDir : satLonDir;
        let dir = dirSelect.value;

        // 1. Convert to a magnitude
        let mag = Math.abs(num);

        // 2. Clamp magnitude to 360
        mag = mag % 360;

        // 3. Apply 180-degree folding and direction reversal
        if (mag > 180) {
            mag = 360 - mag;
            // Reverse direction (E <-> W)
            dirSelect.value = (dir === "E") ? "W" : "E";
        }
        
        // 4. Update input field
        input.value = formatNumber(mag);
    }
}
// --- END MODIFIED FUNCTION ---

function getLatLon() {
  const latVal = parseFloat((latEl.value || "").trim().replace(",", ".")) || 0;
  const lonVal = parseFloat((lonEl.value || "").trim().replace(",", ".")) || 0;
  const satLonVal = parseFloat((satLonEl.value || "").trim().replace(",", ".")) || 0;
  const headingVal = parseFloat((headingEl.value || "").trim().replace(",", ".")) || 0;
  const lat = latDir.value === "N" ? latVal : -latVal;
  const lon = lonDir.value === "E" ? lonVal : -lonVal;
  const satLon = satLonDir.value === "E" ? satLonVal : -satLonVal;
  return { lat, lon, satLon, heading: headingVal };
}
function calcAzEl(lat, lon, satLon) {
  const Re = 6378.137, h = 35786.0;
  const latR = lat * Math.PI / 180, lonR = lon * Math.PI / 180, satLonR = satLon * Math.PI / 180;
  const xObs = Re * Math.cos(latR) * Math.cos(lonR), yObs = Re * Math.cos(latR) * Math.sin(lonR), zObs = Re * Math.sin(latR);
  const xSat = (Re + h) * Math.cos(satLonR), ySat = (Re + h) * Math.sin(satLonR), zSat = 0;
  const dx = xSat - xObs, dy = ySat - yObs, dz = zSat - zObs;
  const e = -Math.sin(lonR) * dx + Math.cos(lonR) * dy;
  const n = -Math.sin(latR) * Math.cos(lonR) * dx - Math.sin(latR) * Math.sin(lonR) * dy + Math.cos(latR) * dz;
  const u = Math.cos(latR) * Math.cos(lonR) * dx + Math.cos(latR) * Math.sin(lonR) * dy + Math.sin(latR) * dz;
  let az = Math.atan2(e, n) * 180 / Math.PI;
  if (az < 0) az += 360;
  const el = Math.atan2(u, Math.sqrt(e * e + n * n)) * 180 / Math.PI;
  return { az, el };
}
const vesselImg = new Image();
vesselImg.crossOrigin = "anonymous";
vesselImg.src = "https://pgarciafer.github.io/satcalc/IMG_0585.PNG";
// Fix: Cast vesselCanvas to HTMLCanvasElement
const vesselCanvas = document.getElementById("vesselCanvas") as HTMLCanvasElement;
const vesselCtx = vesselCanvas.getContext("2d");
function drawVesselWithREL(rel) {
if (!vesselCtx) return;
vesselCtx.clearRect(0, 0, vesselCanvas.width, vesselCanvas.height);

const scaleFactor = 0.75;
const scale = Math.min(vesselCanvas.width / vesselImg.width, vesselCanvas.height / vesselImg.height) * scaleFactor;
const imgW = vesselImg.width * scale;
const imgH = vesselImg.height * scale;
const imgX = (vesselCanvas.width - imgW) / 2;
const imgY = (vesselCanvas.height - imgH) / 2;

vesselCtx.drawImage(vesselImg, imgX, imgY, imgW, imgH);

const centerX = vesselCanvas.width / 2;
const centerY = vesselCanvas.height / 2;
const radius = Math.min(imgW, imgH) / 2;

const rows = Array.from(zonesBody.querySelectorAll('tr'));
rows.forEach((row, idx) => {
const start = parseFloat(row.cells[0].querySelector("input").value);
const stop = parseFloat(row.cells[1].querySelector("input").value);
if (isNaN(start) || isNaN(stop)) return;

const startRad = (start - 90) * Math.PI / 180;
const stopRad  = (stop - 90) * Math.PI / 180;

vesselCtx.beginPath();
vesselCtx.moveTo(centerX, centerY);
vesselCtx.arc(centerX, centerY, radius, startRad, stopRad, false);
vesselCtx.closePath();

vesselCtx.fillStyle = zoneColors[idx % zoneColors.length];
vesselCtx.fill();
});

const angleRad = (rel - 90) * Math.PI / 180;
const endX = centerX + radius * Math.cos(angleRad);
const endY = centerY + radius * Math.sin(angleRad);

vesselCtx.beginPath();
vesselCtx.moveTo(centerX, centerY);
vesselCtx.lineTo(endX, endY);
vesselCtx.strokeStyle = "red";
vesselCtx.lineWidth = 3;
vesselCtx.stroke();
}

function calculateTrim(az, el) {
    const azGreen = parseFloat(azGreenEl.value) || 0;
    const azCurrent = parseInt(azCurrentEl.value) || 0;
    const elGreen = parseFloat(elGreenEl.value) || 0;
    const elCurrent = parseInt(elCurrentEl.value) || 0;

    const azNew = Math.round(((az - azGreen) * 10) + azCurrent);
    const elNew = Math.round(((el - elGreen) * 10) + elCurrent);

    azNewEl.value = azNew.toString();
    elNewEl.value = elNew.toString();
}

function updateAll() {
  const { lat, lon, satLon, heading } = getLatLon();
  const { az, el } = calcAzEl(lat, lon, satLon);
  
  azVal.textContent = 'AZ=' + formatNumber(az);
  elVal.textContent = 'EL=' + formatNumber(el);
  const rel = ((az - heading) + 360) % 360;
  relVal.textContent = 'REL=' + formatNumber(rel);
  
const blockZones = checkBlockingZones(rel, el);
const relBlockMsg = document.getElementById("relBlockMsg");

if (blockZones) {
const zone = blockZones[0];
relBlockMsg.textContent = `Blockage area #${zone.index} (EL < ${zone.elBlock}°)`;
relBlockMsg.style.color = zoneColors[(zone.index - 1) % zoneColors.length];
} else {
relBlockMsg.textContent = "";
}
  
  if (vesselImg.complete) {
    drawVesselWithREL(rel);
  } else {
    vesselImg.onload = () => drawVesselWithREL(rel);
  }
  if (el < MIN_ELEVATION) {
    elVal.innerHTML = `EL=<span style="color:red;">${formatNumber(el)} (Out of Range)</span>`;
  } else {
    elVal.textContent = 'EL=' + formatNumber(el);
  }
  const step = 0.5;
  let visibleLons = [];
  for (let lonSat = -180; lonSat <= 180; lonSat += step) {
    const { el: testEl } = calcAzEl(lat, lon, lonSat);
    if (testEl > MIN_ELEVATION) visibleLons.push(lonSat);
  }
  if (visibleLons.length > 0) {
    const minLonRaw = Math.min(...visibleLons);
    const maxLonRaw = Math.max(...visibleLons);
    const minLon = formatLonEW(minLonRaw);
    const maxLon = formatLonEW(maxLonRaw);
    document.getElementById("visibleRange").innerHTML =
      `Visible range (EL > ${MIN_ELEVATION}):<br>${minLon} to ${maxLon}`;
  } else {
    document.getElementById("visibleRange").innerHTML =
      `No satellites visible above horizon`;
  }
  copyBtn.disabled = false;
  pdfBtn.disabled = false;
  computeSatRangesAndRender();
  drawElGraph(lat, lon);
  buildLegendAndMap();
  updateSatelliteLists();
  calculateTrim(az, el);
}
async function getAndShowLocation() {
  if (!('geolocation' in navigator)) {
    alert("Geolocation not supported.");
    return;
  }
  const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };
  // Fix: Add void to Promise generic type
  return new Promise<void>(resolve => {
    navigator.geolocation.getCurrentPosition(pos => {
      const c = pos.coords;
      
      // Use the helper to update coordinates, ensuring normalization
      updateCoordinatesFromMapClick(c.latitude, c.longitude);

      updateAll();
      resolve();
    }, err => {
      alert('Location error: ' + err.message);
      resolve();
    }, opts);
  });
}
refreshBtn.addEventListener("click", () => getAndShowLocation());
copyBtn.addEventListener("click", () => {
  const { lat, lon, satLon, heading } = getLatLon();
  const latText = formatNumber(Math.abs(lat)) + "°" + (lat >= 0 ? "N" : "S");
  const lonText = formatNumber(Math.abs(lon)) + "°" + (lon >= 0 ? "E" : "W");
  const satLonText = formatLonEW(satLon);
  let text = `Lat=${latText}\nLon=${lonText}\nSatLon=${satLonText}\nHeading=${heading}\n\n`;
  const visibleRangeEl = document.getElementById("visibleRange");
  if (visibleRangeEl && visibleRangeEl.textContent.trim() !== "") {
    text += visibleRangeEl.textContent + "\n\n";
  }
  const rows = Array.from(zonesBody.querySelectorAll("tr"));
  if (rows.length > 0) {
    text += "Blockage Zones:\n";
    rows.forEach((row, idx) => {
      const start = row.cells[0].querySelector("input").value;
      const stop = row.cells[1].querySelector("input").value;
      text += `  Zone ${idx + 1}: ${start}°–${stop}°\n`;
    });
  }
  const ranges = satRangesList.innerText.trim();
  if (ranges !== "") {
    text += "Blocking ranges:\n" + ranges + "\n";
  }
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => copyBtn.textContent = "Copy", 1000);
  });
});



pdfBtn.addEventListener("click", () => {
window.print();
});


// Apply normalization on input blur/change
[latEl, lonEl, satLonEl].forEach(inp => {
  inp.addEventListener("blur", () => {
    normalizeInput(inp, 180); // 180 max is for degrees magnitude
    updateAll();
  });
  inp.addEventListener("input", updateAll);
  // Fix: Cast event target to HTMLInputElement to use select()
  inp.addEventListener("focus", e => setTimeout(() => (e.target as HTMLInputElement).select(), 0));
});
[latDir, lonDir, satLonDir].forEach(sel => sel.addEventListener("change", () => {
    // Re-run normalization and update to handle direction change
    normalizeInput(lonEl.id === 'lon' ? lonEl : satLonEl, 180);
    updateAll();
}));

headingEl.addEventListener("blur", () => {
  normalizeInput(headingEl, 360);
  updateAll();
});
headingEl.addEventListener("input", updateAll);
// Fix: Cast event target to HTMLInputElement to use select()
headingEl.addEventListener("focus", e => setTimeout(() => (e.target as HTMLInputElement).select(), 0));

// Listeners for the new trim table inputs
[azGreenEl, azCurrentEl, elGreenEl, elCurrentEl].forEach(inp => {
    inp.addEventListener("input", updateAll);
    inp.addEventListener("blur", () => {
        // Trim values don't use 0-180 E/W conversion, keep original check
        normalizeInput(inp, 360); 
        updateAll();
    });
    // Fix: Cast event target to HTMLInputElement to use select()
    inp.addEventListener("focus", e => setTimeout(() => (e.target as HTMLInputElement).select(), 0));
});

// --- NEW HELPER FUNCTION for map clicks (includes normalization) ---
function updateCoordinatesFromMapClick(lat, lon) {
    // 1. Latitude conversion (simple absolute value and direction)
    latEl.value = formatNumber(Math.abs(lat));
    latDir.value = lat >= 0 ? "N" : "S";

    // 2. Longitude conversion (360-degree wrapping for display standard)
    // Ensure the raw longitude is treated correctly for wrapping logic
    let rawLon = lon;
    let lonDirection = rawLon >= 0 ? "E" : "W";
    let absLon = Math.abs(rawLon);

    let normalizedLon = absLon;
    if (absLon > 180) {
        // Apply 180-degree folding and direction reversal
        normalizedLon = 360 - absLon;
        lonDirection = (lonDirection === "E") ? "W" : "E";
    }
    
    // Final normalization to ensure 180 is not displayed as 0 and vice-versa
    if (normalizedLon === 360) normalizedLon = 0;
    
    lonEl.value = formatNumber(normalizedLon);
    lonDir.value = lonDirection;
}
// --- END NEW HELPER FUNCTION ---

function computeSatRangesForZone(startAZ, stopAZ, lat, lon, heading, step = 1) {
  const start = (startAZ + 360) % 360;
  const stop = (stopAZ + 360) % 360;
  const segments = [];
  let inside = false;
  let segStart = null;
  const nSteps = Math.round((360 / step));
  for (let i = 0; i <= nSteps; i++) {
    const satLon = -180 + i * step;
    const { az, el } = calcAzEl(lat, lon, satLon);
    if (el < 0) {
      if (inside) {
        const endEstimate = refineBoundary(segStart, satLon - step, lat, lon, heading, start, stop, step);
        segments.push([segStart, endEstimate]);
        inside = false;
        segStart = null;
      }
      continue;
    }
    const rel = ((az - heading) + 360) % 360;
    let inZone = false;
    if (start <= stop) {
      inZone = (rel >= start && rel <= stop);
    } else {
      inZone = (rel >= start || rel <= stop);
    }
    if (inZone && !inside) {
      const entry = refineBoundary(satLon - step, satLon, lat, lon, heading, start, stop, step, true);
      segStart = entry;
      inside = true;
    } else if (!inZone && inside) {
      const exit = refineBoundary(satLon - step, satLon, lat, lon, heading, start, stop, step);
      segments.push([segStart, exit]);
      inside = false;
      segStart = null;
    }
  }
  if (inside) {
    segments.push([segStart, 180]);
  }
  console.debug('computeSatRangesForZone', { startAZ, stopAZ, segments });
  return segments;
}
function refineBoundary(a, b, lat, lon, heading, start, stop, coarseStep, findEntry = false) {
  if (a < -180) a = -180;
  if (b > 180) b = 180;
  const subSteps = 10;
  let best = findEntry ? b : a;
  for (let k = 0; k <= subSteps; k++) {
    const t = k / subSteps;
    const satLon = a + (b - a) * t;
    const { az, el } = calcAzEl(lat, lon, satLon);
    if (el < 0) continue;
    const rel = ((az - heading) + 360) % 360;
    let inZone = false;
    if (start <= stop) inZone = (rel >= start && rel <= stop);
    else inZone = (rel >= start || rel <= stop);
    if (inZone) {
      if (findEntry) {
        best = Math.min(best, satLon);
      } else {
        best = Math.max(best, satLon);
      }
    }
  }
  return Math.round(best * 100) / 100;
}
function computeSatRangesAndRender() {
  const { lat, lon, heading } = getLatLon();
  const rows = Array.from(zonesBody.querySelectorAll('tr'));
  if (rows.length === 0) {
    satRangesList.innerHTML = "<i>(no Blockage Zones)</i>";
    return;
  }
  const sampleStep = 0.5;
  const outPieces = [];
  rows.forEach((row, idx) => {
    const start = parseFloat(row.cells[0].querySelector("input").value);
    const stop = parseFloat(row.cells[1].querySelector("input").value);
    if (isNaN(start) || isNaN(stop)) return;
    let ranges = computeSatRangesForZone(start, stop, lat, lon, heading, sampleStep);
    const west = [], east = [];
    ranges.forEach(([a, b]) => {
      let A = ((a + 540) % 360) - 180;
      let B = ((b + 540) % 360) - 180;
      if (A > B) {
        const tmp = A;
        A = B;
        B = tmp;
      }
      if (B <= 0) {
        const lo = Math.abs(B);
        const hi = Math.abs(A);
        west.push([lo, hi]);
      } else if (A >= 0) {
        east.push([A, B]);
      } else {
        west.push([Math.abs(A), 180]);
        east.push([0, B]);
      }
    });
    function mergeIntervals(list) {
      if (list.length <= 1) return list;
      list.sort((a, b) => a[0] - b[0]);
      const merged = [list[0].slice()];
      for (let i = 1; i < list.length; i++) {
        const [s, e] = list[i];
        const last = merged[merged.length - 1];
        if (s <= last[1] + 0.5) {
          last[1] = Math.max(last[1], e);
        } else merged.push([s, e]);
      }
      return merged;
    }
    const mergedWest = mergeIntervals(west);
    const mergedEast = mergeIntervals(east);
    const parts = [];
    mergedWest.forEach(([lo, hi]) => {
      if (hi < lo) {
        const t = lo;
        lo = hi;
        hi = t;
      }
      parts.push(`${formatNumber(lo)}°W to ${formatNumber(hi)}°W`);
    });
    mergedEast.forEach(([lo, hi]) => {
      if (hi < lo) {
        const t = lo;
        lo = hi;
        hi = t;
      }
      parts.push(`${formatNumber(lo)}°E to ${formatNumber(hi)}°E`);
    });
    
    // Corrected code: Added span element with color to the output
    const zoneColor = zoneColors[idx % zoneColors.length].replace("0.25", "1.0");

    if (parts.length === 0) {
      outPieces.push(`<div class="zone-range"><span class="color" style="background:${zoneColor}"></span> Zone ${idx + 1} No blockage for visible Satellites</div>`);
    } else {
      outPieces.push(`<div class="zone-range"><span class="color" style="background:${zoneColor}"></span> Zone ${idx + 1} Blockage range:  ${parts.join(', ')}</div>`);
    }
  });
  
  
  
  
  if (outPieces.length === 0) {
satRangesList.innerHTML = "<i>(no Blockage Zones)</i>";
satRangesList.classList.remove("two-col");
} else {
satRangesList.innerHTML = outPieces.join("");
if (outPieces.length > 1) {
satRangesList.classList.add("two-col");
} else {
satRangesList.classList.remove("two-col");
}
}

  
  
}
function setupKeyboardNavigation() {
  const focusable = Array.from(document.querySelectorAll("input, select"));
  focusable.forEach((el, idx) => {
    // Fix: cast el to HTMLElement to add event listener
    (el as HTMLElement).onkeydown = (e: KeyboardEvent) => {
      let newIndex = null;
      if (e.key === "Enter" && (el as HTMLElement).tagName !== "SELECT") {
        e.preventDefault();
        newIndex = e.shiftKey ? idx - 1 : idx + 1;
      }
      if ((el as HTMLElement).tagName !== "SELECT") {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          newIndex = idx + 1;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          newIndex = idx - 1;
        }
      }
      if (newIndex !== null) {
        if (newIndex < 0) newIndex = focusable.length - 1;
        if (newIndex >= focusable.length) newIndex = 0;
        // Fix: cast to HTMLElement to use focus()
        (focusable[newIndex] as HTMLElement).focus();
      }
    };
  });
}
window.addEventListener('DOMContentLoaded', () => {
  setupKeyboardNavigation();
  updateAll();

  // Set initial values for RX Green fields after initial calculation
  const { az, el } = calcAzEl(getLatLon().lat, getLatLon().lon, getLatLon().satLon);
  azGreenEl.value = formatNumber(az);
  elGreenEl.value = formatNumber(el);
});
window.addEventListener("error", function(event) {
  let msg = document.getElementById("errorBox");
  if (!msg) {
    msg = document.createElement("div");
    msg.id = "errorBox";
    msg.style.background = "#fee";
    msg.style.color = "red";
    msg.style.padding = "8px";
    msg.style.border = "1px solid red";
    msg.style.margin = "10px 0";
    msg.style.fontWeight = "bold";
    document.body.prepend(msg);
  }
  msg.textContent = "⚠️ Error: " + event.message + " (line " + event.lineno + ")";
});
window.addEventListener("resize", updateAll);

// --- Leaflet Map and Plotter Functionality ---

// NOTE: Removed WORLD_MAX_BOUNDS and related restrictions for infinite horizontal scroll

let mymap = L.map('mapid', {
    bounceAtZoomLimits: false 
}).setView([0, 0], 2);

// Variable to hold the marker and its duplicates
let userMarkerGroup = L.layerGroup().addTo(mymap);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(mymap);

// To ensure the map centers on the prime meridian copy initially
if (mymap && mymap.getContainer()) {
    mymap.panTo([0, 0]);
}

let userMarker = null; // The primary marker instance
let legendControl;
// Fix: Add type to allBeamsData to allow property access
let allBeamsData: {[key: string]: any} = {};
let layersMap = new Map();
const satDropdown = document.getElementById('satDropdown') as HTMLSelectElement;
// Fix: Add type to colorMap
let colorMap: {[key: string]: string} = {};


mymap.on('click', function(e) {
  const newLat = e.latlng.lat;
  const newLon = e.latlng.lng;

  // --- FIX: Use helper function to normalize coordinates from map click ---
  updateCoordinatesFromMapClick(newLat, newLon);
  // -----------------------------------------------------------------------

  updateAll();
});

const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', handleFileSelect, false);

// Listen for changes on the new dropdown list
satDropdown.addEventListener('change', () => {
    const selectedLon = satDropdown.value;
    if (selectedLon) {
        satLonEl.value = formatNumber(Math.abs(parseFloat(selectedLon)));
        satLonDir.value = parseFloat(selectedLon) < 0 ? 'W' : 'E';
    }
    updateAll();
});

function generateColors(num) {
    const colors = [];
    for (let i = 0; i < num; i++) {
        const hue = i * (360 / num);
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
}

function formatLongitude(longitude) {
    return `${Math.abs(longitude)}°${longitude >= 0 ? 'E' : 'W'}`;
}

// --- CORRECTED FUNCTION: Antimeridian Fix (Used for Drawing and Visibility Check) ---
function handleAntimeridianCrossing(points) {
  if (!points || points.length < 2) return points;

  let newPoints = [];
  // The first point is added as is.
  newPoints.push([points[0][0], points[0][1]]); 

  for (let i = 1; i < points.length; i++) {
      const currentLat = points[i][0];
      const currentLon = points[i][1];
      
      // The last added longitude in the adjusted list.
      const prevAdjLon = newPoints[i - 1][1]; 
      
      // Get the raw longitude of the previous point to calculate the difference.
      const prevRawLon = points[i - 1][1];
      let diff = currentLon - prevRawLon;
      
      let newLon;

      // Adjust diff to represent the shortest path between the two points in raw coordinates.
      // We apply the correction to the 'diff' itself first.
      if (diff > 180) {
          diff -= 360;
      } else if (diff < -180) {
          diff += 360;
      }
      
      // The new adjusted longitude for the current point is the previous adjusted longitude plus the *true* difference (shortest distance).
      newLon = prevAdjLon + diff;

      // The current point needs to be added with its corrected longitude.
      newPoints.push([currentLat, newLon]);
  }
  
  return newPoints;
}
// --- END CORRECTED FUNCTION ---

function handleFileSelect(event) {
  const file = (event.target as HTMLInputElement).files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      // Fix: Add type guard for e.target.result
      if (e.target && typeof e.target.result === 'string') {
        const jsonContent = JSON.parse(e.target.result);
        processConstellationData(jsonContent);
      }
    } catch (error) {
      alert('Error parsing JSON file: ' + (error as Error).message);
    }
  };
  reader.readAsText(file);
}

function processConstellationData(data) {
    if (!data.CONSTELLATION || !data.CONSTELLATION.SATELLITES) {
        alert('Invalid JSON structure.');
        return;
    }
    
    if (legendControl) {
        mymap.removeControl(legendControl);
    }

    mymap.eachLayer(function (layer) {
        if (layer.options.isContour) {
            mymap.removeLayer(layer);
        }
    });

    allBeamsData = {};
    layersMap = new Map();

    // Fix: Removed broken filter logic that caused a syntax error
    const filteredSatellites = data.CONSTELLATION.SATELLITES;
    
    filteredSatellites.forEach(satellite => {
        if (satellite.BEAM && satellite.CARRIER) {
            satellite.BEAM.forEach(beam => {
                const carriers = satellite.CARRIER.filter(c => c.beam_id === beam.beam_id);
                if (carriers.length > 0) {
                    // Unique ID is sat-id-beam-id
                    const uniqueId = `${satellite.satellite_id}-${beam.beam_id}`;
                    allBeamsData[uniqueId] = {
                        satelliteId: satellite.satellite_id,
                        longitude: satellite.longitude,
                        formattedLongitude: formatLongitude(satellite.longitude),
                        beamId: beam.beam_id,
                        contours: beam.CONTOUR,
                        carriers: carriers,
                        layer: null,
                        isChecked: false
                    };
                }
            });
        }
    });
    
    const sortedBeamIds = Object.keys(allBeamsData).sort((a, b) => {
        return allBeamsData[a].longitude - allBeamsData[b].longitude;
    });

    const colors = generateColors(sortedBeamIds.length);
    colorMap = {};
    sortedBeamIds.forEach((id, index) => {
        colorMap[id] = colors[index];
    });

    sortedBeamIds.forEach(id => {
        const beamData = allBeamsData[id];
        const beamColor = colorMap[id];
        const layers = [];
        
        const popupContent = `
            <b>Satellite ID:</b> ${beamData.satelliteId}<br>
            <b>Longitude:</b> ${beamData.formattedLongitude}<br>
            <b>Beam ID:</b> ${beamData.beamId}<br>
            <b>Polarization:</b> ${[...new Set(beamData.carriers.map(c => c.polarization))].join(', ')}<br>
            <hr>
            <b>Carriers:</b><br>
            ${beamData.carriers.map(carrier => {
                const centerFreqKHz = (parseFloat(carrier.center_freq) / 1000).toFixed(2);
                return `
                    - RF Center Freq: ${centerFreqKHz} KHz<br>
                    - Polarization: ${carrier.polarization}<br>
                    - Symbol Rate: ${carrier.symbol_rate}<br>
                `;
            }).join('')}
        `;
        
        beamData.contours.forEach(contour => {
            // Determine if a contour exists and whether it's a polygon or circle
            if (contour.type === 1 && contour.points) {
                
                // 1. Get the Antimeridian-corrected base polygon points
                const antimeridianFixedPoints = handleAntimeridianCrossing(contour.points);
                
                // 2. Function to create and add the polygon layer for a given shift
                const addPolygonLayer = (points, shift) => {
                    const shiftedPoints = points.map(p => [p[0], p[1] + shift]);
                    const latlngs = shiftedPoints.map(point => [point[0], point[1]]);
                    
                    // --- FIX: Removed .bindPopup(popupContent) to prevent automatic popup on map click ---
                    const layer = L.polygon(latlngs, { color: beamColor, isContour: true });
                    L.DomEvent.disableClickPropagation(layer);
                    // ----------------------------------------------------------------------------------
                    return layer;
                };

                // 3. Add the primary, corrected polygon (0 shift)
                layers.push(addPolygonLayer(antimeridianFixedPoints, 0));
                
                // 4. Determine if duplication is needed for world wrapping
                const minLon = antimeridianFixedPoints.reduce((min, p) => Math.min(min, p[1]), Infinity);
                const maxLon = antimeridianFixedPoints.reduce((max, p) => Math.max(max, p[1]), -Infinity);
                
                // A heuristic: if the polygon spans close to the 180/-180 line, or is wide enough to show on copies.
                const isNearAntimeridian = minLon < -160 || maxLon > 160 || (maxLon - minLon) > 300;

                if (isNearAntimeridian) {
                    // Add duplication for multiple world copies for infinite scroll effect
                    const shiftBase = [360, 720, 1080];
                    shiftBase.forEach(shift => {
                        layers.push(addPolygonLayer(antimeridianFixedPoints, -shift));
                        layers.push(addPolygonLayer(antimeridianFixedPoints, shift));
                    });
                }
                
            } else if (contour.type === 0 && contour.center && contour.radius) {
                // Circles don't require complex antimeridian handling like polygons
                const centerLatlng = [contour.center[0], contour.center[1]];
                // --- FIX: Removed .bindPopup(popupContent) to prevent automatic popup on map click ---
                const layer = L.circle(centerLatlng, {
                    color: beamColor,
                    fillColor: beamColor,
                    fillOpacity: 0.5,
                    radius: contour.radius * 1000,
                    isContour: true
                });
                // ----------------------------------------------------------------------------------
                layers.push(layer);
                
                // Duplicate circles for infinite map copies:
                const shiftBase = [360, 720, 1080];
                shiftBase.forEach(shift => {
                    layers.push(L.circle([contour.center[0], contour.center[1] - shift], { color: beamColor, fillColor: beamColor, fillOpacity: 0.5, radius: contour.radius * 1000, isContour: true }));
                    layers.push(L.circle([contour.center[0], contour.center[1] + shift], { color: beamColor, fillColor: beamColor, fillOpacity: 0.5, radius: contour.radius * 1000, isContour: true }));
                });
            }
        });
        const layerGroup = L.layerGroup(layers);
        allBeamsData[id].layer = layerGroup;
    });

    buildLegendAndMap();
    updateSatelliteDropdown();
}

function isPointInPolygon(point, polygon) {
    let x = point.lat, y = point.lng;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// --- MODIFIED FUNCTION: checkFootprintVisibility ---
function checkFootprintVisibility(beamData, userPoint) {
    let isUserInFootprint = false;
    beamData.contours.forEach(contour => {
        if (contour.type === 1 && contour.points) {
            // 1. Apply the Antimeridian fix to the polygon points
            const correctedPoints = handleAntimeridianCrossing(contour.points);
            
            const userLat = userPoint.lat;
            const userLon = userPoint.lng;
            
            // 2. Get min/max longitude of the corrected points
            let minLon = Infinity;
            let maxLon = -Infinity;
            correctedPoints.forEach(p => {
                minLon = Math.min(minLon, p[1]);
                maxLon = Math.max(maxLon, p[1]);
            });
            
            // 3. Check for visibility against the central, +360, and -360 versions of the polygon.
            const potentialUserLons = [userLon, userLon + 360, userLon - 360, userLon + 720, userLon - 720];
            
            for (const shiftedUserLon of potentialUserLons) {
                // Check if the shifted user longitude falls within the polygon's corrected longitude span, plus a tolerance for the actual intersection test.
                if (shiftedUserLon >= minLon - 1 && shiftedUserLon <= maxLon + 1) {
                     const tempUserPoint = { lat: userLat, lng: shiftedUserLon };
                     
                     // Run the original point-in-polygon logic on the corrected points
                     if (isPointInPolygon(tempUserPoint, correctedPoints)) {
                         isUserInFootprint = true;
                         break;
                     }
                }
            }
            
        } else if (contour.type === 0 && contour.center && contour.radius) {
            const center = { lat: contour.center[0], lng: contour.center[1] };
            
            // For circles, we check multiple wraps for the center point to see if the user is in the circle on any map copy.
            const userLat = userPoint.lat;
            const userLon = userPoint.lng;
            const centerLons = [center.lng, center.lng + 360, center.lng - 360, center.lng + 720, center.lng - 720];
            const radiusM = contour.radius * 1000;
            
            for (const centerLon of centerLons) {
                const checkCenter = L.latLng(center.lat, centerLon);
                const currentDistance = mymap.distance(L.latLng(userLat, userLon), checkCenter);
                if (currentDistance <= radiusM) {
                    isUserInFootprint = true;
                    break;
                }
            }
        }
    });
    return isUserInFootprint;
}
// --- END MODIFIED FUNCTION ---

function showBeamDetails(beamData) {
    if (!beamData) {
        beamDetailsEl.innerHTML = '';
        return;
    }
    const carriersInfo = beamData.carriers.map(carrier => `
- RF Center Freq: ${(parseFloat(carrier.center_freq) / 1000).toFixed(2)} KHz<br>
- Polarization: ${carrier.polarization}<br>
- Symbol Rate: ${carrier.symbol_rate}<br>
`).join('');
    
    beamDetailsEl.innerHTML = `
Satellite ID: ${beamData.satelliteId}<br>
Longitude: ${beamData.formattedLongitude}<br>
Beam ID: ${beamData.beamId}<br>
${carriersInfo}
`;
}

function updateSatelliteDropdown() {
  const { lat, lon } = getLatLon();
  const userPoint = { lat: lat, lng: lon };
  
  satDropdown.innerHTML = '<option><option value="">Select a visible satellite</option></option>';
  
  const visibleBeams = Object.values(allBeamsData).filter(beamData => 
    checkFootprintVisibility(beamData, userPoint)
  ).sort((a, b) => a.longitude - b.longitude);
  
  const uniqueVisibleSatellites = new Map();
  visibleBeams.forEach(beamData => {
    const satelliteKey = `${beamData.satelliteId}-${beamData.longitude}`;
    if (!uniqueVisibleSatellites.has(satelliteKey)) {
      // Note: This still calculates polarizations per-satellite for the dropdown, 
      // which is useful for selecting a satellite (not a beam).
      const polarizations = [...new Set(visibleBeams.filter(b => b.satelliteId === beamData.satelliteId).flatMap(b => b.carriers.map(c => c.polarization)))].join(', ');
      uniqueVisibleSatellites.set(satelliteKey, {
        id: beamData.satelliteId,
        longitude: beamData.longitude,
        polarization: polarizations
      });
    }
  });
  
  const sortedUniqueSatellites = Array.from(uniqueVisibleSatellites.values()).sort((a, b) => a.longitude - b.longitude);

  sortedUniqueSatellites.forEach(sat => {
    const option = document.createElement('option');
    option.value = sat.longitude;
    option.textContent = `${sat.id} (${formatLongitude(sat.longitude)}) - ${sat.polarization}`;
    satDropdown.appendChild(option);
  });
}

function buildLegendAndMap() {
    if (legendControl) {
        mymap.removeControl(legendControl);
    }

    const { lat, lon } = getLatLon();
    const userPoint = L.latLng(lat, lon); // Convert to LatLng object once for convenience
    
    // --- FIX: Extract userLat and userLon for marker creation ---
    const userLat = userPoint.lat;
    const userLon = userPoint.lng;
    // -------------------------------------------------------------

    // Get the current map zoom level before setting the new center
    const currentZoom = mymap.getZoom(); 

    // 1. CLEAR AND UPDATE USER MARKERS (New logic for marker duplication for infinite scroll)
    userMarkerGroup.clearLayers();

    // Add the primary marker (needed for updating coordinates later)
    if (!userMarker) {
         userMarker = L.marker([userLat, userLon]);
    }
    userMarker.setLatLng(userPoint);
    userMarkerGroup.addLayer(userMarker);

    // Add marker duplicates for infinite world wrapping
    const shiftBase = [360, 720, 1080];
    shiftBase.forEach(shift => {
        userMarkerGroup.addLayer(L.marker(L.latLng(userLat, userLon + shift)));
        userMarkerGroup.addLayer(L.marker(L.latLng(userLat, userLon - shift)));
    });
    
    // 2. CLEAR AND UPDATE BEAM LAYERS
    Object.keys(allBeamsData).forEach(id => {
        if (mymap.hasLayer(allBeamsData[id].layer)) {
            mymap.removeLayer(allBeamsData[id].layer);
        }
    });
    
    // 3. SET MAP VIEW
    mymap.setView([lat, lon], currentZoom); 

    const uniqueBeamIds = Object.keys(allBeamsData).sort((a, b) => {
        const lonA = allBeamsData[a].longitude;
        const lonB = allBeamsData[b].longitude;
        return lonA - lonB;
    });

    if (uniqueBeamIds.length === 0) {
        showBeamDetails(null);
        return;
    }

    // 4. BUILD LEGEND AND SET DEFAULT CHECKED STATE
    legendControl = L.control({position: 'bottomright'});
    legendControl.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = '<h4>Select Beams</h4>';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'legend-button';
        selectAllBtn.textContent = 'Select All Visible';
        selectAllBtn.onclick = () => {
            uniqueBeamIds.forEach(id => {
                const beamData = allBeamsData[id];
                if (checkFootprintVisibility(beamData, userPoint)) {
                    const checkbox = document.getElementById(`beam-checkbox-${id}`) as HTMLInputElement;
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        beamData.isChecked = true;
                        if (!mymap.hasLayer(beamData.layer)) {
                            mymap.addLayer(beamData.layer);
                        }
                    }
                }
            });
        };
        div.appendChild(selectAllBtn);

        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.className = 'legend-button';
        deselectAllBtn.textContent = 'Deselect All';
        deselectAllBtn.onclick = () => {
            uniqueBeamIds.forEach(id => {
                const beamData = allBeamsData[id];
                const checkbox = document.getElementById(`beam-checkbox-${id}`) as HTMLInputElement;
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    beamData.isChecked = false;
                    if (mymap.hasLayer(beamData.layer)) {
                        mymap.removeLayer(beamData.layer);
                    }
                }
            });
            showBeamDetails(null);
        };
        div.appendChild(deselectAllBtn);
        
        uniqueBeamIds.forEach((id, index) => {
            const beamData = allBeamsData[id];
            const isVisible = checkFootprintVisibility(beamData, userPoint);

            if (isVisible) {
                // --- MODIFIED LOGIC: Set isChecked to true if visible for default display ---
                beamData.isChecked = true;

                const item = document.createElement('div');
                item.className = 'legend-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `beam-checkbox-${id}`;
                checkbox.checked = beamData.isChecked;
                checkbox.onchange = (e) => {
                    // Fix: Cast event target to HTMLInputElement to access 'checked' property
                    beamData.isChecked = (e.target as HTMLInputElement).checked;
                    if ((e.target as HTMLInputElement).checked) {
                        if (!mymap.hasLayer(beamData.layer)) {
                            mymap.addLayer(beamData.layer);
                        }
                    } else {
                        if (mymap.hasLayer(beamData.layer)) {
                            mymap.removeLayer(beamData.layer);
                        }
                    }
                };
                item.appendChild(checkbox);

                const colorBox = document.createElement('i');
                colorBox.style.background = colorMap[id];
                item.appendChild(colorBox);

                const polarizations = [...new Set(beamData.carriers.map(c => c.polarization))].join(', ');
                const text = document.createElement('span');
                // MODIFIED: Use formatLongitude to correctly display West longitudes without the minus sign.
                text.innerHTML = `<b>${allBeamsData[id].satelliteId}</b> (${formatLongitude(allBeamsData[id].longitude)}) - Beam ${allBeamsData[id].beamId} (${polarizations})`;
                item.appendChild(text);

                div.appendChild(item);

                // --- MODIFIED LOGIC: Add layer to map if visible (checked by default) ---
                if (beamData.isChecked && !mymap.hasLayer(beamData.layer)) {
                    mymap.addLayer(beamData.layer);
                }
            }
        });
        L.DomEvent.disableScrollPropagation(div);
        L.DomEvent.disableClickPropagation(div);
        return div;
    };
    legendControl.addTo(mymap);
}

// New/Modified helper function to get polarizations specific to a single beam
function getBeamPolarizations(beamData) {
    // Find unique polarizations only from the carriers of this specific beam
    const polarizations = [...new Set(beamData.carriers.map(c => c.polarization))].join(', ');
    return polarizations;
}

function updateSatelliteLists() {
    const { lat, lon, heading, satLon } = getLatLon();
    const userPoint = { lat: lat, lng: lon };
    
    visibleSatellitesList.innerHTML = '<h4>Visible and Unblocked Satellites</h4>';
    blockedSatellitesList.innerHTML = '<h4>Blocked Satellites</h4>';
    
    // Filter and sort all beams visible in the footprint
    const visibleBeams = Object.values(allBeamsData).filter(beamData =>
        checkFootprintVisibility(beamData, userPoint)
    ).sort((a, b) => a.longitude - b.longitude);

    // Iterate directly over each visible beam
    visibleBeams.forEach(beamData => {
        const { az, el } = calcAzEl(lat, lon, beamData.longitude);
        const rel = ((az - heading) + 360) % 360;
        const blockZones = checkBlockingZones(rel, el);
        
        const li = document.createElement('div');
        li.className = 'sat-list-item';
        
        // Get polarization for the current beam
        const polarizations = getBeamPolarizations(beamData);
        
        // Text includes Satellite ID, Longitude, Beam ID, and Beam Polarizations
        const beamText = `${beamData.satelliteId} (${formatLongitude(beamData.longitude)}) - Beam ${beamData.beamId} (${polarizations})`;
        
        // Add the blockage zone information if blocked
        if (blockZones) {
            const zoneInfo = blockZones.map(zone => {
                const color = zoneColors[zone.index - 1].replace("0.5", "1.0");
                return `<span style="color:${color};">&#9679;</span> Zone #${zone.index}`;
            }).join(', ');
            li.innerHTML = `${beamText} (${zoneInfo})`;
        } else {
            li.innerHTML = beamText;
        }

        // Set up click handler
        li.onclick = () => {
            satLonEl.value = formatNumber(Math.abs(beamData.longitude));
            satLonDir.value = beamData.longitude < 0 ? 'W' : 'E';
            updateAll();
            highlightListItem(li, 'visibleSatellites');
            highlightListItem(li, 'blockedSatellites');
            showBeamDetails(beamData); // Show details for the specific beam
        };

        // Highlight if current SatLon and Beam matches
        const uniqueBeamId = `${beamData.satelliteId}-${beamData.beamId}`;
        const currentSatLon = getLatLon().satLon;
        
        // Find the unique ID of the currently selected satellite/beam
        const selectedBeamData = Object.values(allBeamsData).find(b => 
            b.longitude === currentSatLon && String(b.satelliteId) === satLonEl.value
        );
        const currentSelectedUniqueId = selectedBeamData ? `${selectedBeamData.satelliteId}-${selectedBeamData.beamId}` : null;
        
        if (currentSelectedUniqueId === uniqueBeamId) {
            li.classList.add('selected');
        } else {
            li.classList.remove('selected');
        }

        if (blockZones) {
            blockedSatellitesList.appendChild(li);
        } else {
            visibleSatellitesList.appendChild(li);
        }
    });
    
    if (visibleSatellitesList.children.length <= 1) {
      const noSatellitesMessage = document.createElement('p');
      noSatellitesMessage.textContent = 'No unblocked beams found.';
      visibleSatellitesList.appendChild(noSatellitesMessage);
    }
    if (blockedSatellitesList.children.length <= 1) {
      const noSatellitesMessage = document.createElement('p');
      noSatellitesMessage.textContent = 'No blocked beams found.';
      blockedSatellitesList.appendChild(noSatellitesMessage);
    }
}

function highlightListItem(item, listId) {
    const list = document.getElementById(listId);
    if (list) {
        // Only remove highlights in the list where the item is being clicked/highlighted
        Array.from(list.children).forEach(child => {
            child.classList.remove('selected');
        });
        item.classList.add('selected');
    }
    // Also ensure the other list is deselected correctly
    const otherListId = listId === 'visibleSatellites' ? 'blockedSatellites' : 'visibleSatellites';
    const otherList = document.getElementById(otherListId);
    if (otherList) {
         Array.from(otherList.children).forEach(child => {
            // Find the corresponding item in the other list to deselect it
            if (child.innerHTML === item.innerHTML) {
                child.classList.remove('selected');
            }
        });
    }
}