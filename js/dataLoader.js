/**
 * dataLoader.js
 * Loads and preprocesses Manufacturing_QC_Data.csv
 * Author: Khadija Jumani
 */

"use strict";

const DataLoader = (() => {

  // Processed data stores
  let _raw = [];
  let _byFactory = {};
  let _factories = [];
  let _byProduct = {};
  let _byMachine = {};

  // ── Parse CSV ────────────────────────────────────────────────────────────────
  async function load(onProgress) {
    const raw = await d3.csv("Manufacturing_QC_Data.csv", (d, i) => {
      // Stream progress
      if (i % 500 === 0 && onProgress) {
        onProgress(i);
      }

      return {
        date:               new Date(d.Date),
        month:              d.Month,
        quarter:            d.Quarter,
        year:               parseInt(d.Year) || 2024,
        factory:            d.Factory.trim(),
        machineId:          d.Machine_ID.trim(),
        shift:              d.Shift.trim(),
        operatorId:         d.Operator_ID.trim(),
        productType:        d.Product_Type.trim(),
        unitsTarget:        parseInt(d.Units_Target) || 0,
        unitsProduced:      parseInt(d.Units_Produced) || 0,
        goodUnits:          parseInt(d.Good_Units) || 0,
        defectiveUnits:     parseInt(d.Defective_Units) || 0,
        defectRate:         parseFloat(d["Defect_Rate_%"]) || 0.0,
        defectType:         d.Defect_Type.trim(),
        downtimeMinutes:    parseInt(d.Downtime_Minutes) || 0,
        temperatureC:       parseFloat(d.Temperature_C) || 0.0,
        pressureBar:        parseFloat(d.Pressure_Bar) || 0.0,
        productionCost:     parseFloat(d.Production_Cost_PKR) || 0.0,
        scrapCost:          parseFloat(d.Scrap_Cost_PKR) || 0.0,
        efficiency:         parseFloat(d["Efficiency_%"]) || 0.0
      };
    });

    _raw = raw.filter(Boolean);

    // Grouping structures
    _byFactory = d3.group(_raw, d => d.factory);
    _factories = Array.from(_byFactory.keys()).sort();
    
    _byProduct = d3.group(_raw, d => d.productType);
    _byMachine = d3.group(_raw, d => d.machineId);

    return {
      raw: _raw,
      factories: _factories
    };
  }

  // ── KPI computation ──────────────────────────────────────────────────────────
  function getKpis(factory = "All") {
    const data = factory === "All" ? _raw : (_byFactory.get(factory) || []);
    
    const totalProduced   = d3.sum(data, d => d.unitsProduced);
    const totalGood       = d3.sum(data, d => d.goodUnits);
    const totalDefective  = d3.sum(data, d => d.defectiveUnits);
    const avgDefectRate   = d3.mean(data, d => d.defectRate);
    const avgEfficiency   = d3.mean(data, d => d.efficiency);
    const totalScrapCost  = d3.sum(data, d => d.scrapCost);
    const totalProdCost   = d3.sum(data, d => d.productionCost);
    const avgDowntime     = d3.mean(data, d => d.downtimeMinutes);

    return {
      totalProduced,
      totalGood,
      totalDefective,
      avgDefectRate,
      avgEfficiency,
      totalScrapCost,
      totalProdCost,
      avgDowntime,
      yieldRate: totalProduced ? (totalGood / totalProduced * 100) : 0.0,
      scrapPct: totalProdCost ? (totalScrapCost / totalProdCost * 100) : 0.0
    };
  }

  // ── Defect Distribution ──────────────────────────────────────────────────────
  function getDefectDistribution(factory = "All") {
    const data = factory === "All" ? _raw : (_byFactory.get(factory) || []);
    const groups = d3.rollup(
      data, 
      v => v.length, 
      d => d.defectType
    );
    
    // Sort and return as array: [{ type, count }]
    return Array.from(groups, ([type, count]) => ({ type, count }))
      .filter(d => d.type && d.type !== "None"); // Skip rows with no defects if applicable
  }

  // ── Product Defect Rankings ──────────────────────────────────────────────────
  function getProductRankings() {
    return Array.from(_byProduct, ([product, rows]) => {
      const produced = d3.sum(rows, d => d.unitsProduced);
      const defective = d3.sum(rows, d => d.defectiveUnits);
      return {
        product,
        defectRate: produced ? (defective / produced * 100) : 0.0,
        produced,
        defective
      };
    }).sort((a, b) => b.defectRate - a.defectRate);
  }

  // ── Machine Performance ──────────────────────────────────────────────────────
  function getMachinePerformance() {
    return Array.from(_byMachine, ([machineId, rows]) => {
      const avgEfficiency = d3.mean(rows, d => d.efficiency);
      const avgDefectRate = d3.mean(rows, d => d.defectRate);
      const totalProduced = d3.sum(rows, d => d.unitsProduced);
      const totalDowntime = d3.sum(rows, d => d.downtimeMinutes);
      
      return {
        machineId,
        efficiency: avgEfficiency,
        defectRate: avgDefectRate,
        produced: totalProduced,
        downtime: totalDowntime
      };
    }).sort((a, b) => a.machineId.localeCompare(b.machineId));
  }

  // ── Monthly Trends ───────────────────────────────────────────────────────────
  function getMonthlyTrends() {
    const monthOrder = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];

    const rolled = d3.rollup(
      _raw,
      v => ({
        defectRate: d3.mean(v, d => d.defectRate),
        efficiency: d3.mean(v, d => d.efficiency),
        unitsProduced: d3.sum(v, d => d.unitsProduced)
      }),
      d => `${d.year}-${d.month}`
    );

    return Array.from(rolled, ([key, val]) => {
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr);
      const monthNum = monthOrder.indexOf(monthStr) + 1;
      
      return {
        key,
        year,
        month: monthStr,
        date: new Date(year, monthNum - 1, 1),
        defectRate: val.defectRate,
        efficiency: val.efficiency,
        unitsProduced: val.unitsProduced
      };
    }).sort((a, b) => a.date - b.date);
  }

  // ── Scatter Data Sample ──────────────────────────────────────────────────────
  function getScatterData(sampleSize = 600) {
    // Return a random/representative sample to make rendering responsive
    if (_raw.length <= sampleSize) {
      return _raw;
    }
    
    // Simple deterministic sampling for consistency
    const step = Math.floor(_raw.length / sampleSize);
    const sample = [];
    for (let i = 0; i < _raw.length && sample.length < sampleSize; i += step) {
      sample.push(_raw[i]);
    }
    return sample;
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    load,
    getKpis,
    getDefectDistribution,
    getProductRankings,
    getMachinePerformance,
    getMonthlyTrends,
    getScatterData,
    get raw() { return _raw; },
    get factories() { return _factories; }
  };
})();
