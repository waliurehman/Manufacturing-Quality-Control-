/**
 * utils.js
 * Shared utility functions, formatting, and colors for ApexQC
 * Authors: Wali Ur Rehman & Khadija Jumani
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
    Morning: "#10b981",  // Emerald Green
    Evening: "#0ea5e9",  // Sky Blue
    Night:   "#f43f5e",  // Rose Red
    
    // Factories
    "Factory-Lahore":    "#a78bfa", // Soft Purple
    "Factory-Islamabad": "#38bdf8", // Sky blue-cyan
    "Factory-Karachi":   "#fb7185", // Pinkish-red
    
    // Defect types
    "Material Defect":  "#ef4444", // Red
    "Dimensional Error": "#f97316", // Orange
    "Assembly Fault":    "#3b82f6", // Blue
    "Surface Crack":     "#eab308", // Yellow
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
    formatNumber,
    formatPercent,
    formatCurrency,
    formatDowntime,
    shiftColor,
    factoryColor,
    defectColor,
    debounce
  };
})();
