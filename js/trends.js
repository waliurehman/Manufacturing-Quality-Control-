/**
 * trends.js
 * Monthly Yield Trends (Defect Rate vs. Efficiency) with Timeline Brush Zoom
 * Author: Khadija Jumani
 */

"use strict";

const TrendsChart = (() => {

  // Layout settings
  const mMain  = { top: 20, right: 60, bottom: 40, left: 50 };
  const mBrush = { top: 6,  right: 60, bottom: 20, left: 50 };

  let svgMain, svgBrush;
  let gMain, gBrush;
  let mainW, mainH, brushH;

  // Scales & Axes
  let xMain, yDefectMain, yEffMain;
  let xBrush, yDefectBrush, yEffBrush;
  
  // Brush extent
  let brushExtent = null;
  
  // Tooltip
  const tooltip = document.getElementById("globalTooltip");

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    setupDimensions();
    setupMainSvg();
    setupBrushSvg();
    render();
  }

  function setupDimensions() {
    const cont = document.getElementById("trendsContainer");
    const totalW = cont.clientWidth || 960;
    
    mainW  = totalW - mMain.left - mMain.right;
    mainH  = 320 - mMain.top - mMain.bottom;
    brushH = 60  - mBrush.top - mBrush.bottom;
  }

  // ── Main line chart SVG setup ──
  function setupMainSvg() {
    const totalW = mainW + mMain.left + mMain.right;
    const totalH = mainH + mMain.top  + mMain.bottom;

    svgMain = d3.select("#trendsSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svgMain.append("defs").append("clipPath")
      .attr("id", "trendsClip")
      .append("rect")
      .attr("width", mainW)
      .attr("height", mainH);

    gMain = svgMain.append("g")
      .attr("transform", `translate(${mMain.left}, ${mMain.top})`);

    // Gridlines & Axes
    gMain.append("g").attr("class", "grid x-grid").attr("transform", `translate(0, ${mainH})`);
    gMain.append("g").attr("class", "grid y-grid");
    gMain.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${mainH})`);
    gMain.append("g").attr("class", "axis y-axis-left");
    gMain.append("g").attr("class", "axis y-axis-right").attr("transform", `translate(${mainW}, 0)`);

    // Line Groups
    gMain.append("g").attr("class", "lines-group").attr("clip-path", "url(#trendsClip)");

    // Labels
    gMain.append("text").attr("class", "axis-label")
      .attr("x", mainW / 2).attr("y", mainH + 34)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-secondary)").attr("font-size", "10px")
      .text("Production Month");

    gMain.append("text").attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -mainH / 2).attr("y", -36)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--accent-red)").attr("font-size", "10px")
      .text("Average Defect Rate (%)");

    gMain.append("text").attr("class", "axis-label")
      .attr("transform", "rotate(90)")
      .attr("x", mainH / 2).attr("y", -mainW - 36)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--accent-green)").attr("font-size", "10px")
      .text("Average Efficiency (%)");

    // Legends
    gMain.append("g").attr("class", "trends-legend").attr("transform", `translate(${mainW - 220}, -10)`);
  }

  // ── Brush Timeline SVG setup ──
  function setupBrushSvg() {
    const totalW = mainW + mBrush.left + mBrush.right;
    const totalH = brushH + mBrush.top  + mBrush.bottom;

    svgBrush = d3.select("#brushSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    gBrush = svgBrush.append("g")
      .attr("transform", `translate(${mBrush.left}, ${mBrush.top})`);

    // Timeline elements
    gBrush.append("g").attr("class", "brush-lines");
    gBrush.append("g").attr("class", "axis brush-x-axis").attr("transform", `translate(0, ${brushH})`);

    const brush = d3.brushX()
      .extent([[0, 0], [mainW, brushH]])
      .on("brush end", onBrush);

    gBrush.append("g").attr("class", "brush").call(brush);
  }

  // ── Render Chart (supports instantaneous update flag) ────────────────────────
  function render(instant = false) {
    const data = DataLoader.getMonthlyTrends();
    if (!data.length) return;

    // Full domains
    const xDomainFull = d3.extent(data, d => d.date);
    
    // Timeline scale
    xBrush = d3.scaleTime().domain(xDomainFull).range([0, mainW]);

    // Active scale domain
    const xDomainMain = brushExtent 
      ? [xBrush.invert(brushExtent[0]), xBrush.invert(brushExtent[1])]
      : xDomainFull;

    xMain = d3.scaleTime().domain(xDomainMain).range([0, mainW]);

    // Left Y Axis (Defect rate)
    yDefectMain = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.defectRate) * 1.1 || 10])
      .range([mainH, 0]).nice();

    // Right Y Axis (Efficiency)
    yEffMain = d3.scaleLinear()
      .domain([75, 90]) // Specific to efficiency range
      .range([mainH, 0]).nice();

    // Timeline Y scale
    yDefectBrush = d3.scaleLinear().domain(yDefectMain.domain()).range([brushH, 0]);

    // Render Gridlines (No transitions during brush dragging to avoid stutters)
    const tDuration = instant ? 0 : 500;

    gMain.select(".x-grid")
      .transition().duration(tDuration)
      .call(d3.axisBottom(xMain).ticks(6).tickSize(-mainH).tickFormat(""));

    gMain.select(".y-grid")
      .transition().duration(tDuration)
      .call(d3.axisLeft(yDefectMain).ticks(6).tickSize(-mainW).tickFormat(""));

    // Render Axes
    gMain.select(".x-axis")
      .transition().duration(tDuration)
      .call(d3.axisBottom(xMain).ticks(6).tickFormat(d3.timeFormat("%b %y")));

    gMain.select(".y-axis-left")
      .transition().duration(tDuration)
      .call(d3.axisLeft(yDefectMain).ticks(6).tickFormat(d => d + "%"));

    gMain.select(".y-axis-right")
      .transition().duration(tDuration)
      .call(d3.axisRight(yEffMain).ticks(6).tickFormat(d => d + "%"));

    // Line & Area Generators
    const lineDefect = d3.line()
      .x(d => xMain(d.date))
      .y(d => yDefectMain(d.defectRate))
      .curve(d3.curveMonotoneX);

    const lineEff = d3.line()
      .x(d => xMain(d.date))
      .y(d => yEffMain(d.efficiency))
      .curve(d3.curveMonotoneX);

    const areaDefect = d3.area()
      .x(d => xMain(d.date))
      .y0(mainH).y1(d => yDefectMain(d.defectRate))
      .curve(d3.curveMonotoneX);

    const areaEff = d3.area()
      .x(d => xMain(d.date))
      .y0(mainH).y1(d => yEffMain(d.efficiency))
      .curve(d3.curveMonotoneX);

    // Render paths
    const linesG = gMain.select(".lines-group");

    // Defect Rate Line
    let dPath = linesG.select(".defect-path");
    if (dPath.empty()) dPath = linesG.append("path").attr("class", "defect-path trend-line").attr("stroke", "var(--accent-red)");
    dPath.datum(data).transition().duration(tDuration).attr("d", lineDefect);

    let dArea = linesG.select(".defect-area");
    if (dArea.empty()) dArea = linesG.append("path").attr("class", "defect-area trend-area").attr("fill", "var(--accent-red)");
    dArea.datum(data).transition().duration(tDuration).attr("d", areaDefect);

    // Efficiency Line
    let ePath = linesG.select(".eff-path");
    if (ePath.empty()) ePath = linesG.append("path").attr("class", "eff-path trend-line").attr("stroke", "var(--accent-green)");
    ePath.datum(data).transition().duration(tDuration).attr("d", lineEff);

    let eArea = linesG.select(".eff-area");
    if (eArea.empty()) eArea = linesG.append("path").attr("class", "eff-area trend-area").attr("fill", "var(--accent-green)");
    eArea.datum(data).transition().duration(tDuration).attr("d", areaEff);

    // Interactive Hover elements
    setupHoverTracking(data);

    // Render Brush Timeline
    renderBrush(data);
    drawLegends();
  }

  // ── Hover Guidelines and details tooltip ──
  function setupHoverTracking(data) {
    gMain.selectAll(".hover-line").remove();
    gMain.selectAll(".hover-dot").remove();

    const hoverLine = gMain.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0).attr("y2", mainH)
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-dasharray", "3, 3")
      .style("display", "none");

    const dotDefect = gMain.append("circle")
      .attr("class", "hover-dot")
      .attr("r", 5)
      .attr("fill", "var(--accent-red)")
      .attr("stroke", "#ffffff").attr("stroke-width", "1.5px")
      .style("display", "none");

    const dotEff = gMain.append("circle")
      .attr("class", "hover-dot")
      .attr("r", 5)
      .attr("fill", "var(--accent-green)")
      .attr("stroke", "#ffffff").attr("stroke-width", "1.5px")
      .style("display", "none");

    // Catch mouse interactions over the chart area
    const overlay = gMain.select(".ts-overlay");
    let rectOverlay = overlay.empty() ? gMain.append("rect").attr("class", "ts-overlay") : overlay;
    
    rectOverlay
      .attr("width", mainW)
      .attr("height", mainH)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mouseover", () => {
        hoverLine.style("display", "block");
        dotDefect.style("display", "block");
        dotEff.style("display", "block");
      })
      .on("mouseout", () => {
        hoverLine.style("display", "none");
        dotDefect.style("display", "none");
        dotEff.style("display", "none");
        Utils.hideTooltip(tooltip);
      })
      .on("mousemove", function(event) {
        const [mx] = d3.pointer(event, this);
        const mDate = xMain.invert(mx);
        
        // Find nearest month
        const nearest = data.reduce((a, b) => 
          Math.abs(b.date - mDate) < Math.abs(a.date - mDate) ? b : a
        );

        const nx = xMain(nearest.date);
        
        hoverLine.attr("x1", nx).attr("x2", nx);
        dotDefect.attr("cx", nx).attr("cy", yDefectMain(nearest.defectRate));
        dotEff.attr("cx", nx).attr("cy", yEffMain(nearest.efficiency));

        Utils.showTooltip(tooltip, `
          <div class="tt-title">${nearest.month} ${nearest.year}</div>
          <div class="tt-row"><span class="tt-key">Defect Rate</span><span class="tt-val text-defect">${Utils.formatPercent(nearest.defectRate)}</span></div>
          <div class="tt-row"><span class="tt-key">Efficiency</span><span class="tt-val text-efficiency">${Utils.formatPercent(nearest.efficiency)}</span></div>
          <div class="tt-row"><span class="tt-key">Units Produced</span><span class="tt-val">${Utils.formatNumber(nearest.unitsProduced)}</span></div>
        `, event);
      });
  }

  // ── Render Brush timeline ──
  function renderBrush(data) {
    const lineBrush = d3.line()
      .x(d => xBrush(d.date))
      .y(d => yDefectBrush(d.defectRate))
      .curve(d3.curveMonotoneX);

    const bLines = gBrush.select(".brush-lines");
    bLines.selectAll("path").remove();
    
    // Draw simplified line in timeline background
    bLines.append("path")
      .datum(data)
      .attr("d", lineBrush)
      .attr("stroke", "rgba(14, 165, 233, 0.4)")
      .attr("stroke-width", 1.2)
      .attr("fill", "none");

    gBrush.select(".brush-x-axis")
      .call(d3.axisBottom(xBrush).ticks(6).tickFormat(d3.timeFormat("%y")));
  }

  // ── Brush event handler ──
  function onBrush(event) {
    brushExtent = event.selection;
    // Pass 'instant = true' to avoid transition collisions during dragging
    render(true);
  }

  // ── Legends Drawing ──
  function drawLegends() {
    const legG = gMain.select(".trends-legend");
    legG.selectAll("*").remove();

    const legendItems = [
      { label: "Defect Rate (%)", color: "var(--accent-red)" },
      { label: "Machine Efficiency (%)", color: "var(--accent-green)" }
    ];

    const items = legG.selectAll(".ts-leg")
      .data(legendItems)
      .enter().append("g")
      .attr("transform", (_, i) => `translate(${i * 120}, 0)`);

    items.append("line")
      .attr("x1", 0).attr("x2", 15)
      .attr("y1", 6).attr("y2", 6)
      .attr("stroke", d => d.color)
      .attr("stroke-width", 2.2);

    items.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("font-size", "10px")
      .attr("fill", "var(--text-secondary)")
      .text(d => d.label);
  }

  function handleResize() {
    setupDimensions();
    
    // Re-adjust SVG viewbox settings
    const totalW = mainW + mMain.left + mMain.right;
    svgMain.attr("viewBox", `0 0 ${totalW} 320`);
    svgBrush.attr("viewBox", `0 0 ${totalW} 60`);

    // Update positions of responsive labels
    gMain.select(".axis-label[text-anchor='middle']").attr("x", mainW / 2);
    gMain.select(".y-axis-right").attr("transform", `translate(${mainW}, 0)`);
    gMain.select(".trends-legend").attr("transform", `translate(${mainW - 220}, -10)`);
    
    // Redraw axes lines
    render();
  }

  return { init, render, handleResize };
})();

window.TrendsChart = TrendsChart;
