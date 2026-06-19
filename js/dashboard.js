/**
 * dashboard.js
 * Factory Selector, Yield KPIs, and Defect Distribution Donut Chart
 * Author: Khadija Jumani
 */

"use strict";

const Dashboard = (() => {

  let svg, g;
  let W, H;
  let currentFactory = "All";
  const tooltip = document.getElementById("globalTooltip");

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    setupSvg();
    setupControls();
    update();
  }

  function setupSvg() {
    const cont = document.getElementById("donutContainer");
    const totalW = cont.clientWidth || 450;
    const totalH = 350;

    svg = d3.select("#donutSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    g = svg.append("g")
      .attr("transform", `translate(${totalW / 2}, ${totalH / 2})`);

    // Center Label Container
    g.append("text").attr("class", "donut-center-title")
      .attr("text-anchor", "middle")
      .attr("dy", "-5px");

    g.append("text").attr("class", "donut-center-sub")
      .attr("text-anchor", "middle")
      .attr("dy", "15px")
      .text("Total Defects");

    W = totalW;
    H = totalH;
  }

  // ── Update Data & Views ──────────────────────────────────────────────────────
  function update() {
    const kpis = DataLoader.getKpis(currentFactory);
    const defectData = DataLoader.getDefectDistribution(currentFactory);

    // 1. Update Yield & Operational KPI panels
    d3.select("#facYield").text(Utils.formatPercent(kpis.yieldRate));
    d3.select("#facProduced").text(`${Utils.formatNumber(kpis.totalProduced)} units produced`);
    
    d3.select("#facDefects").text(Utils.formatNumber(kpis.totalDefective));
    d3.select("#facDefectRate").text(`${Utils.formatPercent(kpis.avgDefectRate)} Defect Rate`);
    
    d3.select("#facScrapCost").text(Utils.formatCurrency(kpis.totalScrapCost));
    d3.select("#facScrapPct").text(`${Utils.formatPercent(kpis.scrapPct)} of Prod Cost`);
    
    d3.select("#facDowntime").text(Utils.formatDowntime(kpis.avgDowntime));

    // 2. Draw Donut Chart
    drawDonut(defectData, kpis.totalDefective);
  }

  // ── Draw Donut Chart ─────────────────────────────────────────────────────────
  function drawDonut(data, totalDefects) {
    const radius = Math.min(W, H) / 2 - 40;
    
    const pie = d3.pie()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.62)
      .outerRadius(radius);

    const arcHover = d3.arc()
      .innerRadius(radius * 0.62)
      .outerRadius(radius + 8);

    // Update center label
    g.select(".donut-center-title")
      .text(Utils.formatNumber(totalDefects));

    // Bind data
    const arcs = g.selectAll(".donut-arc-group")
      .data(pie(data), d => d.data.type);

    // EXIT
    arcs.exit().remove();

    // ENTER
    const enterG = arcs.enter().append("g")
      .attr("class", "donut-arc-group");

    enterG.append("path")
      .attr("class", "donut-arc")
      .attr("fill", d => Utils.defectColor(d.data.type))
      .each(function(d) { this._current = d; }); // Store current position

    // MERGE
    const allG = enterG.merge(arcs);

    allG.select("path")
      .transition().duration(600)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return t => arc(interpolate(t));
      });

    // Hover Animations & Tooltip
    allG.select("path")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition().duration(200)
          .attr("d", arcHover);
          
        const pct = totalDefects ? (d.data.count / totalDefects * 100) : 0;
        
        Utils.showTooltip(tooltip, `
          <div class="tt-title">${d.data.type}</div>
          <div class="tt-row"><span class="tt-key">Defects</span><span class="tt-val text-accent">${Utils.formatNumber(d.data.count)}</span></div>
          <div class="tt-row"><span class="tt-key">Proportion</span><span class="tt-val text-defect">${Utils.formatPercent(pct)}</span></div>
        `, event);
      })
      .on("mousemove", event => Utils.moveTooltip(tooltip, event))
      .on("mouseout", function() {
        d3.select(this)
          .transition().duration(200)
          .attr("d", arc);
        Utils.hideTooltip(tooltip);
      });

    // Draw Donut Legends
    drawDonutLegends(data);
  }

  // ── Legend Drawing ───────────────────────────────────────────────────────────
  function drawDonutLegends(data) {
    svg.selectAll(".legend-group").remove();

    const legX = W - 160;
    const legY = 60;

    const legends = svg.append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${legX}, ${legY})`);

    const items = legends.selectAll(".donut-legend-item")
      .data(data, d => d.type)
      .enter().append("g")
      .attr("class", "donut-legend-item")
      .attr("transform", (_, i) => `translate(0, ${i * 24})`);

    items.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 3)
      .attr("fill", d => Utils.defectColor(d.type));

    items.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("font-size", "11px")
      .attr("fill", "var(--text-secondary)")
      .text(d => d.type);
  }

  // ── Controls Setup ───────────────────────────────────────────────────────────
  function setupControls() {
    const selector = document.getElementById("factorySelector");
    if (!selector) return;

    selector.addEventListener("click", e => {
      const btn = e.target.closest("button");
      if (!btn) return;

      // Update active toggle state
      selector.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentFactory = btn.dataset.factory;
      update();

      // Trigger updates in other components that are factory-dependent
      if (window.PerformanceChart) {
        window.PerformanceChart.updateFactoryFilter(currentFactory);
      }
      if (window.CorrelationChart) {
        window.CorrelationChart.updateFactoryFilter(currentFactory);
      }
    });
  }

  function handleResize() {
    const cont = document.getElementById("donutContainer");
    const totalW = cont.clientWidth || 450;
    const totalH = 350;

    svg.attr("viewBox", `0 0 ${totalW} ${totalH}`);
    g.attr("transform", `translate(${totalW / 2}, ${totalH / 2})`);
    W = totalW;
    update();
  }

  return { init, update, handleResize };
})();
