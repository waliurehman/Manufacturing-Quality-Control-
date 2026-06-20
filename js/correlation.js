/**
 * correlation.js
 * Process Parameter Scatter Plot with dynamic X/Y axes and Shift/Factory color mapping
 * Author: Wali Ur Rehman
 */

"use strict";

const CorrelationChart = (() => {

  let svg, g;
  let W, H;
  
  // States
  let activeX = "temperatureC";
  let activeY = "efficiency";
  let colorBy = "shift"; // 'shift' or 'factory'
  let currentFactory = "All";

  const margin = { top: 25, right: 30, bottom: 45, left: 58 };
  const tooltip = document.getElementById("globalTooltip");

  // Attribute dictionary mapping select option values to raw dataLoader keys
  const valKeys = {
    Temperature_C:      "temperatureC",
    Pressure_Bar:       "pressureBar",
    Units_Produced:     "unitsProduced",
    Downtime_Minutes:   "downtimeMinutes",
    "Defect_Rate_%":    "defectRate",
    "Efficiency_%":     "efficiency",
    Scrap_Cost_PKR:     "scrapCost"
  };

  const labels = {
    temperatureC:      "Machine Temperature (°C)",
    pressureBar:       "Machine Pressure (Bar)",
    unitsProduced:     "Units Produced per Run",
    downtimeMinutes:   "Machine Downtime (Minutes)",
    defectRate:        "Defect Rate (%)",
    efficiency:        "Machine Efficiency (%)",
    scrapCost:         "Scrap Cost (PKR)"
  };

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    setupSvg();
    setupControls();
    render();
  }

  function setupSvg() {
    const cont = document.getElementById("correlationContainer");
    const totalW = cont.clientWidth || 960;
    const totalH = 420;

    W = totalW - margin.left - margin.right;
    H = totalH - margin.top - margin.bottom;

    svg = d3.select("#correlationSvg")
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("width", "100%")
      .attr("height", totalH)
      .attr("preserveAspectRatio", "xMidYMid meet");

    g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Grid and Axis groups
    g.append("g").attr("class", "grid x-grid").attr("transform", `translate(0, ${H})`);
    g.append("g").attr("class", "grid y-grid");
    g.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${H})`);
    g.append("g").attr("class", "axis y-axis");

    // Title label containers
    g.append("text").attr("class", "axis-label x-label")
      .attr("x", W / 2).attr("y", H + 38)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-secondary)").attr("font-size", "10px");

    g.append("text").attr("class", "axis-label y-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2).attr("y", -44)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-secondary)").attr("font-size", "10px");
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function render() {
    let raw = DataLoader.getScatterData(600); // Sample 600 records for smooth rendering

    // Filter by factory if a specific plant is selected
    if (currentFactory !== "All") {
      raw = raw.filter(d => d.factory === currentFactory);
    }

    const xVal = d => d[activeX];
    const yVal = d => d[activeY];

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(raw, xVal)).nice()
      .range([0, W]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(raw, yVal)).nice()
      .range([H, 0]);

    // Gridlines
    g.select(".x-grid")
      .transition().duration(500)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(-H).tickFormat(""));

    g.select(".y-grid")
      .transition().duration(500)
      .call(d3.axisLeft(yScale).ticks(6).tickSize(-W).tickFormat(""));

    // Axes
    g.select(".x-axis")
      .transition().duration(500)
      .call(d3.axisBottom(xScale).ticks(8));

    g.select(".y-axis")
      .transition().duration(500)
      .call(d3.axisLeft(yScale).ticks(6));

    // Update labels
    g.select(".x-label").text(labels[activeX]);
    g.select(".y-label").text(labels[activeY]);

    // Color mapper based on selection
    const colorScale = d => colorBy === "shift" ? Utils.shiftColor(d.shift) : Utils.factoryColor(d.factory);

    // Bind dots
    const dots = g.selectAll(".scatter-dot")
      .data(raw, (d, i) => i); // Match by index in sampled array

    // EXIT
    dots.exit().transition().duration(300)
      .attr("r", 0)
      .remove();

    // ENTER
    const enterDots = dots.enter().append("circle")
      .attr("class", "scatter-dot")
      .attr("r", 0)
      .attr("cx", d => xScale(xVal(d)))
      .attr("cy", d => yScale(yVal(d)))
      .attr("fill-opacity", 0.7);

    // MERGE + UPDATE
    enterDots.merge(dots)
      .attr("fill", colorScale)
      .transition().duration(800)
      .attr("r", 5)
      .attr("cx", d => xScale(xVal(d)))
      .attr("cy", d => yScale(yVal(d)));

    // Tooltips on dots
    g.selectAll(".scatter-dot")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .transition().duration(150)
          .attr("r", 8);

        const formatVal = (key, val) => {
          if (key === "temperatureC") return val.toFixed(1) + " °C";
          if (key === "pressureBar") return val.toFixed(2) + " Bar";
          if (key === "defectRate" || key === "efficiency") return val.toFixed(2) + "%";
          if (key === "scrapCost") return "PKR " + Utils.formatMillions(val);
          if (key === "downtimeMinutes") return val + " mins";
          if (key === "unitsProduced") return Utils.formatMillions(val);
          return Utils.formatMillions(val);
        };

        Utils.showTooltip(tooltip, `
          <div class="tt-title">QC Record (${d.shift} Shift)</div>
          <div class="tt-row"><span class="tt-key">Factory</span><span class="tt-val">${d.factory.replace("Factory-", "")}</span></div>
          <div class="tt-row"><span class="tt-key">Machine</span><span class="tt-val text-accent">${d.machineId}</span></div>
          <div class="tt-row"><span class="tt-key">Product</span><span class="tt-val">${d.productType}</span></div>
          <div class="tt-row"><span class="tt-key">${labels[activeX]}</span><span class="tt-val">${formatVal(activeX, xVal(d))}</span></div>
          <div class="tt-row"><span class="tt-key">${labels[activeY]}</span><span class="tt-val">${formatVal(activeY, yVal(d))}</span></div>
        `, event);
      })
      .on("mousemove", event => Utils.moveTooltip(tooltip, event))
      .on("mouseout", function(event) {
        d3.select(this)
          .transition().duration(150)
          .attr("r", 5);
        Utils.hideTooltip(tooltip);
      });

    // Draw Legends
    drawLegends();
  }

  // ── Legend Drawing ──
  function drawLegends() {
    const legContainer = document.getElementById("scatterLegend");
    if (!legContainer) return;

    legContainer.innerHTML = "";

    const legendItems = colorBy === "shift" 
      ? [
          { label: "Morning Shift", color: Utils.shiftColor("Morning") },
          { label: "Evening Shift", color: Utils.shiftColor("Evening") },
          { label: "Night Shift", color: Utils.shiftColor("Night") }
        ]
      : [
          { label: "Lahore", color: Utils.factoryColor("Factory-Lahore") },
          { label: "Islamabad", color: Utils.factoryColor("Factory-Islamabad") },
          { label: "Karachi", color: Utils.factoryColor("Factory-Karachi") }
        ];

    legendItems.forEach(item => {
      const div = document.createElement("div");
      div.className = "legend-item";
      div.innerHTML = `<span class="legend-color" style="background:${item.color};"></span><span>${item.label}</span>`;
      legContainer.appendChild(div);
    });
  }

  // ── Controls Setup ──
  function setupControls() {
    const selX = document.getElementById("scatterX");
    const selY = document.getElementById("scatterY");
    const selColor = document.getElementById("scatterColor");

    if (selX) {
      selX.addEventListener("change", () => {
        activeX = valKeys[selX.value] || "temperatureC";
        render();
      });
    }

    if (selY) {
      selY.addEventListener("change", () => {
        activeY = valKeys[selY.value] || "efficiency";
        render();
      });
    }

    if (selColor) {
      selColor.addEventListener("change", () => {
        colorBy = selColor.value.toLowerCase() === "shift" ? "shift" : "factory";
        render();
      });
    }
  }

  function handleResize() {
    const cont = document.getElementById("correlationContainer");
    const totalW = cont.clientWidth || 960;
    
    W = totalW - margin.left - margin.right;
    svg.attr("viewBox", `0 0 ${totalW} 420`);
    
    g.select(".x-label").attr("x", W / 2);
    
    render();
  }

  function updateFactoryFilter(factory) {
    currentFactory = factory;
    render();
  }

  return { init, render, handleResize, updateFactoryFilter };
})();

window.CorrelationChart = CorrelationChart;
