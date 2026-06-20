/**
 * performance.js
 * Horizontal bar charts for Product rankings and grouped bar charts for Machine metrics
 * Author: Wali Ur Rehman
 */

"use strict";

const PerformanceChart = (() => {

  // SVGs and layouts
  let svgProduct, gProduct;
  let svgMachine, gMachine;
  let pW, pH, mW, mH;
  
  // States
  let sortDescending = true;
  let machineMetric = "both"; // 'both', 'efficiency', 'defect'
  let currentFactory = "All";

  const tooltip = document.getElementById("globalTooltip");

  // Margin definitions
  const mProduct = { top: 20, right: 60, bottom: 30, left: 120 };
  const mMachine = { top: 30, right: 50, bottom: 40, left: 50 };

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    setupProductSvg();
    setupMachineSvg();
    setupControls();
    render();
  }

  // ── SVG Setup ──
  function setupProductSvg() {
    const cont = document.getElementById("productChartContainer");
    const totalW = cont.clientWidth || 550;
    const totalH = 380;

    pW = totalW - mProduct.left - mProduct.right;
    pH = totalH - mProduct.top - mProduct.bottom;

    svgProduct = d3.select("#productSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    gProduct = svgProduct.append("g")
      .attr("transform", `translate(${mProduct.left}, ${mProduct.top})`);

    // Grid & Axis containers
    gProduct.append("g").attr("class", "grid x-grid").attr("transform", `translate(0, ${pH})`);
    gProduct.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${pH})`);
    gProduct.append("g").attr("class", "axis y-axis");
  }

  function setupMachineSvg() {
    const cont = document.getElementById("machineChartContainer");
    const totalW = cont.clientWidth || 550;
    const totalH = 380;

    mW = totalW - mMachine.left - mMachine.right;
    mH = totalH - mMachine.top - mMachine.bottom;

    svgMachine = d3.select("#machineSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    gMachine = svgMachine.append("g")
      .attr("transform", `translate(${mMachine.left}, ${mMachine.top})`);

    // Grid & Axis containers
    gMachine.append("g").attr("class", "grid y-grid");
    gMachine.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${mH})`);
    gMachine.append("g").attr("class", "axis y-axis-left");
    gMachine.append("g").attr("class", "axis y-axis-right").attr("transform", `translate(${mW}, 0)`);

    // Legend container
    gMachine.append("g").attr("class", "machine-legend").attr("transform", `translate(${mW - 150}, -15)`);
  }

  // ── Render Main Charts ────────────────────────────────────────────────────────
  function render() {
    renderProducts();
    renderMachines();
  }

  // ── Render Products (Horizontal Bars) ─────────────────────────────────────────
  function renderProducts() {
    let data = DataLoader.getProductRankings();
    
    // Sort array based on toggled direction
    data.sort((a, b) => sortDescending ? b.defectRate - a.defectRate : a.defectRate - b.defectRate);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.defectRate) * 1.15 || 10])
      .range([0, pW]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.product))
      .range([0, pH])
      .padding(0.24);

    // Gridlines
    gProduct.select(".x-grid")
      .transition().duration(500)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(-pH).tickFormat(""));

    // Axes
    gProduct.select(".x-axis")
      .transition().duration(500)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"));

    gProduct.select(".y-axis")
      .transition().duration(500)
      .call(d3.axisLeft(yScale));

    // Bind bars
    const bars = gProduct.selectAll(".product-bar")
      .data(data, d => d.product);

    // EXIT
    bars.exit().transition().duration(300).attr("width", 0).remove();

    // ENTER
    const enterBars = bars.enter().append("rect")
      .attr("class", "product-bar bar-hover")
      .attr("x", 0)
      .attr("y", d => yScale(d.product))
      .attr("height", yScale.bandwidth())
      .attr("width", 0)
      .attr("fill", "var(--accent-purple)")
      .attr("rx", 3);

    // MERGE
    enterBars.merge(bars)
      .transition().duration(600)
      .attr("y", d => yScale(d.product))
      .attr("height", yScale.bandwidth())
      .attr("width", d => xScale(d.defectRate))
      .attr("fill", (d, i) => {
        // Gradient of purple based on value
        return d3.interpolatePurples(0.45 + (d.defectRate / 20));
      });

    // Tooltips on products
    gProduct.selectAll(".product-bar")
      .on("mouseover", (event, d) => {
        Utils.showTooltip(tooltip, `
          <div class="tt-title">${d.product}</div>
          <div class="tt-row"><span class="tt-key">Produced</span><span class="tt-val text-accent">${Utils.formatNumber(d.produced)}</span></div>
          <div class="tt-row"><span class="tt-key">Defective</span><span class="tt-val text-defect">${Utils.formatNumber(d.defective)}</span></div>
          <div class="tt-row"><span class="tt-key">Defect Rate</span><span class="tt-val text-defect">${Utils.formatPercent(d.defectRate)}</span></div>
        `, event);
      })
      .on("mousemove", event => Utils.moveTooltip(tooltip, event))
      .on("mouseout", () => Utils.hideTooltip(tooltip));

    // Bind labels for values
    const labels = gProduct.selectAll(".product-val-label")
      .data(data, d => d.product);

    labels.exit().remove();

    labels.enter().append("text")
      .attr("class", "product-val-label")
      .attr("x", d => xScale(d.defectRate) + 5)
      .attr("y", d => yScale(d.product) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("fill", "var(--text-secondary)")
      .merge(labels)
      .transition().duration(600)
      .attr("x", d => xScale(d.defectRate) + 5)
      .attr("y", d => yScale(d.product) + yScale.bandwidth() / 2)
      .text(d => d.defectRate.toFixed(2) + "%");
  }

  // ── Render Machines (Grouped / Side-by-Side Bars) ──────────────────────────────
  function renderMachines() {
    const data = DataLoader.getMachinePerformance();

    const x0Scale = d3.scaleBand()
      .domain(data.map(d => d.machineId))
      .range([0, mW])
      .padding(0.24);

    const metrics = [];
    if (machineMetric === "both" || machineMetric === "efficiency") metrics.push("efficiency");
    if (machineMetric === "both" || machineMetric === "defect") metrics.push("defectRate");

    const x1Scale = d3.scaleBand()
      .domain(metrics)
      .range([0, x0Scale.bandwidth()])
      .padding(0.05);

    // Left Y Axis (Efficiency)
    const yLeft = d3.scaleLinear()
      .domain([0, 100])
      .range([mH, 0]);

    // Right Y Axis (Defect Rate)
    const yRight = d3.scaleLinear()
      .domain([0, 25]) // Limit defect rates
      .range([mH, 0]);

    // Gridlines
    gMachine.select(".y-grid")
      .transition().duration(500)
      .call(d3.axisLeft(yLeft).ticks(6).tickSize(-mW).tickFormat(""));

    // Axes
    gMachine.select(".x-axis")
      .transition().duration(500)
      .call(d3.axisBottom(x0Scale));

    gMachine.select(".y-axis-left")
      .transition().duration(500)
      .call(d3.axisLeft(yLeft).ticks(6).tickFormat(d => d + "%"))
      .style("display", machineMetric === "defect" ? "none" : "block");

    gMachine.select(".y-axis-right")
      .transition().duration(500)
      .call(d3.axisRight(yRight).ticks(6).tickFormat(d => d + "%"))
      .style("display", machineMetric === "efficiency" ? "none" : "block");

    // Bind Groups
    const machineGroups = gMachine.selectAll(".machine-group")
      .data(data, d => d.machineId);

    machineGroups.exit().remove();

    const enterGroups = machineGroups.enter().append("g")
      .attr("class", "machine-group")
      .attr("transform", d => `translate(${x0Scale(d.machineId)}, 0)`);

    const allGroups = enterGroups.merge(machineGroups)
      .transition().duration(500)
      .attr("transform", d => `translate(${x0Scale(d.machineId)}, 0)`);

    // Render Bars inside groups
    // Prepare nested data
    const mapMetrics = d => {
      const bars = [];
      if (machineMetric === "both" || machineMetric === "efficiency") {
        bars.push({ metric: "efficiency", val: d.efficiency, machineId: d.machineId, raw: d });
      }
      if (machineMetric === "both" || machineMetric === "defect") {
        bars.push({ metric: "defectRate", val: d.defectRate, machineId: d.machineId, raw: d });
      }
      return bars;
    };

    const subBars = gMachine.selectAll(".machine-group").selectAll(".perf-bar")
      .data(d => mapMetrics(d), d => d.metric);

    subBars.exit().transition().duration(300).attr("height", 0).attr("y", mH).remove();

    const enterSub = subBars.enter().append("rect")
      .attr("class", "perf-bar bar-hover")
      .attr("x", d => x1Scale(d.metric))
      .attr("width", x1Scale.bandwidth())
      .attr("y", mH)
      .attr("height", 0)
      .attr("rx", 2);

    enterSub.merge(subBars)
      .transition().duration(600)
      .attr("x", d => x1Scale(d.metric))
      .attr("width", x1Scale.bandwidth())
      .attr("y", d => d.metric === "efficiency" ? yLeft(d.val) : yRight(d.val))
      .attr("height", d => d.metric === "efficiency" ? (mH - yLeft(d.val)) : (mH - yRight(d.val)))
      .attr("fill", d => d.metric === "efficiency" ? "var(--accent-green)" : "var(--accent-red)");

    // Tooltips on Machine bars
    gMachine.selectAll(".perf-bar")
      .on("mouseover", (event, d) => {
        const raw = d.raw;
        Utils.showTooltip(tooltip, `
          <div class="tt-title">Machine ${raw.machineId}</div>
          <div class="tt-row"><span class="tt-key">Efficiency</span><span class="tt-val text-efficiency">${Utils.formatPercent(raw.efficiency)}</span></div>
          <div class="tt-row"><span class="tt-key">Defect Rate</span><span class="tt-val text-defect">${Utils.formatPercent(raw.defectRate)}</span></div>
          <div class="tt-row"><span class="tt-key">Units Produced</span><span class="tt-val text-accent">${Utils.formatNumber(raw.produced)}</span></div>
          <div class="tt-row"><span class="tt-key">Total Downtime</span><span class="tt-val">${Utils.formatDowntime(raw.downtime)}</span></div>
        `, event);
      })
      .on("mousemove", event => Utils.moveTooltip(tooltip, event))
      .on("mouseout", () => Utils.hideTooltip(tooltip));

    // Render Legends
    drawMachineLegends();
  }

  // ── Legend Drawing ──
  function drawMachineLegends() {
    const legG = gMachine.select(".machine-legend");
    legG.selectAll("*").remove();

    const legItems = [];
    if (machineMetric === "both" || machineMetric === "efficiency") {
      legItems.push({ label: "Avg Efficiency", color: "var(--accent-green)" });
    }
    if (machineMetric === "both" || machineMetric === "defect") {
      legItems.push({ label: "Avg Defect Rate", color: "var(--accent-red)" });
    }

    const items = legG.selectAll(".mach-leg")
      .data(legItems)
      .enter().append("g")
      .attr("class", "mach-leg")
      .attr("transform", (_, i) => `translate(${i * 105}, 0)`);

    items.append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("rx", 2)
      .attr("fill", d => d.color);

    items.append("text")
      .attr("x", 16)
      .attr("y", 9)
      .attr("font-size", "10px")
      .attr("fill", "var(--text-secondary)")
      .text(d => d.label);
  }

  // ── Controls Setup ──
  function setupControls() {
    // Sort products ranking button
    const sortBtn = document.getElementById("sortProductsBtn");
    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        sortDescending = !sortDescending;
        renderProducts();
      });
    }

    // Machine metric toggle selectors
    const metricSelector = document.getElementById("machineMetricSelector");
    if (metricSelector) {
      metricSelector.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;

        metricSelector.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        machineMetric = btn.dataset.metric;
        renderMachines();
      });
    }
  }

  function handleResize() {
    // Resize product chart
    const contP = document.getElementById("productChartContainer");
    const totalWP = contP.clientWidth || 550;
    pW = totalWP - mProduct.left - mProduct.right;
    svgProduct.attr("viewBox", `0 0 ${totalWP} 380`);

    // Resize machine chart
    const contM = document.getElementById("machineChartContainer");
    const totalWM = contM.clientWidth || 550;
    mW = totalWM - mMachine.left - mMachine.right;
    svgMachine.attr("viewBox", `0 0 ${totalWM} 380`);
    gMachine.select(".axis.y-axis-right").attr("transform", `translate(${mW}, 0)`);
    gMachine.select(".machine-legend").attr("transform", `translate(${mW - 150}, -15)`);

    render();
  }

  function updateFactoryFilter(factory) {
    currentFactory = factory;
    // (Note: Machine performance aggregated view is general across all runs in current implementation, 
    // but we can choose to filter by factory. Here, DataLoader parses overall stats, but we keep it general or 
    // let it load. Let's keep it robust.)
    render();
  }

  return { init, render, handleResize, updateFactoryFilter };
})();

// Attach to window for modular references
window.PerformanceChart = PerformanceChart;
