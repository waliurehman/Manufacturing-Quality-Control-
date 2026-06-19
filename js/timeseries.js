/**
 * timeseries.js
 * Multi-country animated time-series with brush zoom
 * Authors: Uzair Ali Zahid & Khadija Jumani
 */

"use strict";

const TimeSeries = (() => {

  // ── State ────────────────────────────────────────────────────────────────────
  let selectedCountries = ["Pakistan", "India", "Brazil", "Russia"];
  let smoothing = 12;
  let brushExtent = null;

  const tooltip = document.getElementById("tsTooltip");

  // SVG dimensions
  const mMain  = { top: 20, right: 30, bottom: 40, left: 58 };
  const mBrush = { top: 6,  right: 30, bottom: 20, left: 58 };

  let svgMain, svgBrush;
  let xMain, yMain, xBrush, yBrush;
  let lineMain, areMain;
  let mainW, mainH, brushH;
  let clip;

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    setupDimensions();
    setupMainSvg();
    setupBrushSvg();
    setupSearch();
    setupControls();
    renderChips();
    render();
  }

  function setupDimensions() {
    const cont = document.getElementById("timeseriesContainer");
    const totalW = cont.clientWidth || 960;
    mainW  = totalW - mMain.left - mMain.right;
    mainH  = 380 - mMain.top - mMain.bottom;
    brushH = 70  - mBrush.top - mBrush.bottom;
  }

  // ── Main SVG ─────────────────────────────────────────────────────────────────
  function setupMainSvg() {
    const totalW = mainW + mMain.left + mMain.right;
    const totalH = mainH + mMain.top  + mMain.bottom;

    svgMain = d3.select("#timeseriesSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Clip path to prevent lines overflowing axes
    svgMain.append("defs").append("clipPath")
      .attr("id", "tsClip")
      .append("rect")
      .attr("width",  mainW)
      .attr("height", mainH);

    const root = svgMain.append("g")
      .attr("transform", `translate(${mMain.left},${mMain.top})`);

    // Grid & Axes groups
    root.append("g").attr("class", "grid x-grid").attr("transform", `translate(0,${mainH})`);
    root.append("g").attr("class", "grid y-grid");
    root.append("g").attr("class", "axis x-axis").attr("transform", `translate(0,${mainH})`);
    root.append("g").attr("class", "axis y-axis");

    // Lines group (clipped)
    root.append("g").attr("class", "lines-group").attr("clip-path", "url(#tsClip)");

    // Axis labels
    root.append("text").attr("class","axis-label")
      .attr("x", mainW / 2).attr("y", mainH + 36)
      .attr("text-anchor","middle")
      .attr("fill","var(--text-muted)").attr("font-size",11)
      .text("Year");

    root.append("text").attr("class","axis-label")
      .attr("transform","rotate(-90)")
      .attr("x", -mainH / 2).attr("y", -44)
      .attr("text-anchor","middle")
      .attr("fill","var(--text-muted)").attr("font-size",11)
      .text("Average Temperature (°C)");

    // Legend
    root.append("g").attr("class","ts-legend")
      .attr("transform", `translate(${mainW - 10}, 10)`);
  }

  // ── Brush SVG ────────────────────────────────────────────────────────────────
  function setupBrushSvg() {
    const totalW = mainW + mBrush.left + mBrush.right;
    const totalH = brushH + mBrush.top  + mBrush.bottom;

    svgBrush = d3.select("#brushSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const root = svgBrush.append("g")
      .attr("transform", `translate(${mBrush.left},${mBrush.top})`);

    root.append("g").attr("class","brush-lines");

    const brush = d3.brushX()
      .extent([[0, 0], [mainW, brushH]])
      .on("brush end", onBrush);

    root.append("g").attr("class","brush").call(brush);
    root.append("g").attr("class","axis brush-x-axis").attr("transform",`translate(0,${brushH})`);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function render() {
    const allSeries = selectedCountries.map((c, i) => {
      const raw = DataLoader.annualSeries(c);
      const vals = raw.map(r => r.temp);
      const smoothed = Utils.rollingMean(vals, smoothing);
      return {
        country: c,
        color:   Utils.lineColor(i),
        data:    raw.map((r, j) => ({ ...r, tempSmoothed: smoothed[j] }))
          .filter(r => r.tempSmoothed != null),
      };
    });

    // Full x domain (all years)
    const allDates = allSeries.flatMap(s => s.data.map(d => d.date));
    const xDomainFull = d3.extent(allDates);

    // Brush x scale
    xBrush = d3.scaleTime().domain(xDomainFull).range([0, mainW]);

    // Main x domain = brush selection or full
    const xDomainMain = brushExtent
      ? [xBrush.invert(brushExtent[0]), xBrush.invert(brushExtent[1])]
      : xDomainFull;

    xMain = d3.scaleTime().domain(xDomainMain).range([0, mainW]);

    // Filter data to main domain
    const filteredSeries = allSeries.map(s => ({
      ...s,
      data: s.data.filter(d => d.date >= xDomainMain[0] && d.date <= xDomainMain[1]),
    }));

    // y domain
    const allTemps = filteredSeries.flatMap(s => s.data.map(d => d.tempSmoothed)).filter(Boolean);
    const [yMin, yMax] = d3.extent(allTemps);
    yMain = d3.scaleLinear()
      .domain([yMin - 1, yMax + 1])
      .range([mainH, 0]).nice();

    yBrush = d3.scaleLinear()
      .domain([yMin - 1, yMax + 1])
      .range([brushH, 0]);

    const root = svgMain.select("g");

    // ─ X Grid
    root.select(".x-grid")
      .transition().duration(400)
      .call(d3.axisBottom(xMain).ticks(8).tickSize(-mainH).tickFormat(""));

    // ─ Y Grid
    root.select(".y-grid")
      .transition().duration(400)
      .call(d3.axisLeft(yMain).ticks(6).tickSize(-mainW).tickFormat(""));

    // ─ Axes
    root.select(".x-axis")
      .transition().duration(400)
      .call(d3.axisBottom(xMain).ticks(8).tickFormat(d3.timeFormat("%Y")));
    root.select(".y-axis")
      .transition().duration(400)
      .call(d3.axisLeft(yMain).ticks(6).tickFormat(d => d + "°C"));

    // ─ Line & Area generators
    lineMain = d3.line()
      .x(d => xMain(d.date))
      .y(d => yMain(d.tempSmoothed))
      .curve(d3.curveCatmullRom.alpha(0.5))
      .defined(d => d.tempSmoothed != null);

    areMain = d3.area()
      .x(d => xMain(d.date))
      .y0(mainH)
      .y1(d => yMain(d.tempSmoothed))
      .curve(d3.curveCatmullRom.alpha(0.5))
      .defined(d => d.tempSmoothed != null);

    // ─ Lines
    const linesG = root.select(".lines-group");

    const lineGroups = linesG.selectAll(".ts-country-group")
      .data(filteredSeries, d => d.country);

    // ENTER
    const enterG = lineGroups.enter()
      .append("g")
      .attr("class", "ts-country-group");

    enterG.append("path").attr("class","ts-area");
    enterG.append("path").attr("class","ts-line");

    // MERGE
    const allG = enterG.merge(lineGroups);

    allG.select(".ts-area")
      .transition().duration(500)
      .attr("d", d => areMain(d.data))
      .attr("fill", d => d.color)
      .attr("opacity", 0.1);

    allG.select(".ts-line")
      .transition().duration(500)
      .attr("d", d => lineMain(d.data))
      .attr("stroke", d => d.color)
      .attr("stroke-width", 2.5)
      .attr("fill", "none")
      .attr("opacity", 0.9);

    // EXIT
    lineGroups.exit().remove();

    // Hover overlay
    allG.on("mouseover", function(event, d) {
      const [mx] = d3.pointer(event, root.node());
      const date = xMain.invert(mx);
      const nearest = d.data.reduce((a, b) =>
        Math.abs(b.date - date) < Math.abs(a.date - date) ? b : a
      );
      Utils.showTooltip(tooltip, `
        <div class="tt-title">${d.country}</div>
        <div class="tt-row"><span class="tt-key">Year</span><span class="tt-val">${nearest.year}</span></div>
        <div class="tt-row"><span class="tt-key">Temp</span>
          <span class="tt-val ${d.color}" style="color:${d.color};">${Utils.formatTemp(nearest.tempSmoothed)}</span></div>
      `, event);
    }).on("mousemove", e => Utils.moveTooltip(tooltip, e))
      .on("mouseout",  () => Utils.hideTooltip(tooltip));

    // ─ Legend
    const legG = root.select(".ts-legend");
    const legItems = legG.selectAll(".leg-item").data(filteredSeries, d => d.country);

    const legEnter = legItems.enter().append("g").attr("class","leg-item");
    legEnter.append("line").attr("x1",-60).attr("x2",-44).attr("y1",0).attr("y2",0).attr("stroke-width",2.5);
    legEnter.append("text").attr("x",-40).attr("dy","0.35em").attr("font-size",10);

    const legAll = legEnter.merge(legItems);
    legAll.attr("transform",(_, i) => `translate(0,${i * 18})`);
    legAll.select("line").attr("stroke", d => d.color);
    legAll.select("text").text(d => d.country).attr("fill","var(--text-secondary)");
    legItems.exit().remove();

    // ─ Brush chart
    renderBrush(allSeries, xBrush, yBrush);
  }

  function renderBrush(allSeries, xB, yB) {
    const root = svgBrush.select("g");

    const lineBrush = d3.line()
      .x(d => xB(d.date)).y(d => yB(d.tempSmoothed))
      .defined(d => d.tempSmoothed != null).curve(d3.curveCatmullRom.alpha(0.5));

    const bg = root.select(".brush-lines");
    bg.selectAll(".brush-line").data(allSeries, d => d.country)
      .join("path").attr("class","brush-line")
      .attr("d", d => lineBrush(d.data))
      .attr("stroke", d => d.color).attr("stroke-width",1.2)
      .attr("fill","none").attr("opacity",0.6);

    root.select(".brush-x-axis")
      .call(d3.axisBottom(xB).ticks(6).tickFormat(d3.timeFormat("%Y")));
  }

  function onBrush(event) {
    brushExtent = event.selection;
    render();
  }

  // ── Country chips ────────────────────────────────────────────────────────────
  function renderChips() {
    const container = document.getElementById("countryChips");
    container.innerHTML = "";
    selectedCountries.forEach((c, i) => {
      const color = Utils.lineColor(i);
      const chip  = document.createElement("div");
      chip.className = "chip";
      chip.style.borderColor = color;
      chip.style.color        = color;
      chip.style.background   = color + "18";
      chip.innerHTML = `<span>${c}</span>
        <button class="chip-remove" data-country="${c}" title="Remove">✕</button>`;
      chip.querySelector(".chip-remove").addEventListener("click", () => {
        selectedCountries = selectedCountries.filter(x => x !== c);
        renderChips();
        render();
      });
      container.appendChild(chip);
    });
  }

  // ── Search ───────────────────────────────────────────────────────────────────
  function setupSearch() {
    const input    = document.getElementById("countrySearch");
    const dropdown = document.getElementById("searchDropdown");
    const countries = DataLoader.countries;

    input.addEventListener("input", Utils.debounce(() => {
      const q = input.value.trim().toLowerCase();
      if (!q) { dropdown.classList.remove("visible"); return; }
      const matches = countries.filter(c => c.toLowerCase().includes(q)).slice(0, 12);
      dropdown.innerHTML = matches.map(c =>
        `<div class="dropdown-item" data-c="${c}">${c}</div>`
      ).join("");
      dropdown.classList.toggle("visible", matches.length > 0);
    }, 200));

    dropdown.addEventListener("click", e => {
      const item = e.target.closest(".dropdown-item");
      if (!item) return;
      const c = item.dataset.c;
      if (!selectedCountries.includes(c)) {
        selectedCountries.push(c);
        renderChips();
        render();
      }
      input.value = "";
      dropdown.classList.remove("visible");
    });

    document.addEventListener("click", e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target))
        dropdown.classList.remove("visible");
    });
  }

  // ── Other controls ───────────────────────────────────────────────────────────
  function setupControls() {
    document.getElementById("smoothingSelect").addEventListener("change", e => {
      smoothing = +e.target.value;
      render();
    });

    document.getElementById("clearCountries").addEventListener("click", () => {
      selectedCountries = [];
      renderChips();
      render();
    });
  }

  return { init };
})();
