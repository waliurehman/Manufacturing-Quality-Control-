/**
 * utils.js
 * Shared utility functions, formatting, and colors for ApexQC
 * Author: Wali Ur Rehman
 */

"use strict";

const Utils = (() => {

  // ── Tooltip Helpers ──────────────────────────────────────
  function showTooltip(el, html, event) {
    el.innerHTML = html;
    el.style.display = "block";
    el.style.opacity = 1;
    moveTooltip(el, event);
  }

  function moveTooltip(el, event) {
    const pad = 12;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const tw  = el.offsetWidth  || 180;
    const th  = el.offsetHeight || 80;
    
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    
    // Contain within viewport
    if (x + tw > vw - 12) x = event.clientX - tw - pad;
    if (y + th > vh - 12) y = event.clientY - th - pad;
    
    el.style.left = x + "px";
    el.style.top  = y + "px";
  }

  function hideTooltip(el) {
    el.style.opacity = 0;
    el.style.display = "none";
  }

  // ── Format Helpers ───────────────────────────────────────
  const numFormatter = d3.format(",.0f");
  const currencyFormatter = d3.format(",.2f");

  function formatNumber(v) {
    return numFormatter(v);
  }

  function formatMillions(v) {
    if (v >= 1000000) {
      return (v / 1000000).toFixed(2) + "M";
    } else if (v >= 1000) {
      return (v / 1000).toFixed(1) + "K";
    }
    return v.toFixed(0);
  }

  function formatPercent(v) {
    return v.toFixed(2) + "%";
  }

  function formatCurrency(v) {
    return "PKR " + currencyFormatter(v);
  }

  function formatDowntime(v) {
    return Math.round(v) + " mins";
  }

  // ── Color Schemes ────────────────────────────────────────
  const colors = {
    // Shifts
    Morning: "#2ed573",  // Bright Green
    Evening: "#4faaff",  // Bright Blue
    Night:   "#ff8c42",  // Orange
    
    // Factories
    "Factory-Lahore":    "#dd70db", // Magenta
    "Factory-Islamabad": "#00d4ff", // Cyan
    "Factory-Karachi":   "#ff4757", // Pink-Red
    
    // Defect types
    "Material Defect":  "#ff6348", // Coral Red
    "Dimensional Error": "#ffa502", // Amber
    "Assembly Fault":    "#4faaff", // Sky Blue
    "Surface Crack":     "#ffd93d", // Bright Yellow
  };

  function shiftColor(shift) {
    return colors[shift] || "#94a3b8";
  }

  function factoryColor(factory) {
    return colors[factory] || "#0ea5e9";
  }

  function defectColor(defect) {
    return colors[defect] || "#64748b";
  }

  // ── Debounce ─────────────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ── Public API ───────────────────────────────────────────
  return {
    showTooltip,
    moveTooltip,
    hideTooltip,
    formatNumber,    formatMillions,    formatPercent,
    formatCurrency,
    formatDowntime,
    shiftColor,
    factoryColor,
    defectColor,
    debounce
  };
})();
