/**
 * main.js
 * Application entry point – loads Manufacturing QC data, bootstraps all charts,
 * handles responsive resizing, navigation, and visual scroll reveal.
 * Author: Wali Ur Rehman
 */

"use strict";

(async function App() {

  // ─── Set up scroll reveal IMMEDIATELY so layout sections fade in smoothly
  setupScrollReveal();

  // ─── Loading progress variables ─────────────────────────────────────────────
  const loaderBar     = document.getElementById("loaderBar");
  const loaderPercent = document.getElementById("loaderPercent");

  function setProgress(pct) {
    if (loaderBar)     loaderBar.style.width     = pct + "%";
    if (loaderPercent) loaderPercent.textContent = Math.round(pct) + "%";
  }

  let fakeProgress = 0;
  const fakeTick = setInterval(() => {
    if (fakeProgress < 75) {
      fakeProgress += Math.random() * 5;
      setProgress(Math.min(fakeProgress, 75));
    }
  }, 100);

  // ─── Load CSV data ─────────────────────────────────────────────────────────
  let dataset;
  try {
    dataset = await DataLoader.load((rowIdx) => {
      // Scale dynamic loading progress (5000 rows max)
      const approx = Math.min(90, (rowIdx / 5000) * 90);
      fakeProgress = Math.max(fakeProgress, approx);
      setProgress(fakeProgress);
    });
  } catch (err) {
    clearInterval(fakeTick);
    const loader = document.getElementById("loader");
    if (loader) {
      loader.innerHTML = `
        <div style="text-align:center;padding:40px;max-width:500px;">
          <div style="font-size:3rem">⚠️</div>
          <h2 style="color:#f43f5e;margin:12px 0 8px;font-family:'Space Grotesk',sans-serif;">Data Loading Error</h2>
          <p style="color:#94a3b8;line-height:1.7;font-size:0.92rem;">
            Could not parse <code style="background:#1e293b;padding:2px 6px;border-radius:4px;">Manufacturing_QC_Data.csv</code>.
            Please ensure you are hosting this project via a local web server (e.g., Python HTTP Server or Live Server).
          </p>
          <p style="color:#475569;font-size:0.75rem;margin-top:16px;">${err.message}</p>
        </div>`;
    }
    return;
  }

  // ─── Complete Loader ───────────────────────────────────────────────────────
  clearInterval(fakeTick);
  setProgress(100);
  await new Promise(r => setTimeout(r, 250)); // Tiny pause for visual confirmation
  const loader = document.getElementById("loader");
  if (loader) loader.classList.add("hidden");

  // ─── Initialize Hero Global Statistics ─────────────────────────────────────
  try {
    const kpis = DataLoader.getKpis("All");
    
    d3.select("#globalTotalProduced").text(Utils.formatMillions(kpis.totalProduced));
    d3.select("#globalDefectRate").text(Utils.formatPercent(kpis.avgDefectRate));
    d3.select("#globalEfficiency").text(Utils.formatPercent(kpis.avgEfficiency));
    d3.select("#globalScrapCost").text("PKR " + Utils.formatMillions(kpis.totalScrapCost));
  } catch (e) {
    console.error("Hero statistics layout failed:", e);
  }

  // ─── Bootstrap Visualizations Independently ────────────────────────────────
  try { Dashboard.init();        } catch (e) { console.error("Dashboard Donut init failed:", e); }
  try { PerformanceChart.init(); } catch (e) { console.error("Performance rankings init failed:", e); }
  try { TrendsChart.init();      } catch (e) { console.error("Monthly Trends line init failed:", e); }
  try { CorrelationChart.init(); } catch (e) { console.error("Process Correlation scatter init failed:", e); }

  // ─── Sticky header shadowing ───────────────────────────────────────────────
  window.addEventListener("scroll", () => {
    const header = document.getElementById("siteHeader");
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 30);
    }
  });

  // ─── Nav Highlight and Scroll Spy ──────────────────────────────────────────
  setupNavHighlight();

  // ─── Smooth scrolling transitions for menu navigation links ────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ─── Responsive Window Resizing (Debounced) ────────────────────────────────
  window.addEventListener("resize", Utils.debounce(() => {
    try { Dashboard.handleResize();        } catch (e) { /* silent */ }
    try { PerformanceChart.handleResize(); } catch (e) { /* silent */ }
    try { TrendsChart.handleResize();      } catch (e) { /* silent */ }
    try { CorrelationChart.handleResize(); } catch (e) { /* silent */ }
  }, 150));

  // ───────────────────────────────────────────────────────────────────────────
  // SCROLL REVEAL UTILITY
  // ───────────────────────────────────────────────────────────────────────────
  function setupScrollReveal() {
    document.querySelectorAll(".viz-section").forEach(el => {
      el.classList.add("animate-hidden");
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });

    document.querySelectorAll(".viz-section").forEach(el => observer.observe(el));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // NAV SCROLL SPY UTILITY
  // ───────────────────────────────────────────────────────────────────────────
  function setupNavHighlight() {
    const sections = [
      { id: "section-overview",    key: "overview"    },
      { id: "section-factory",     key: "factory"     },
      { id: "section-performance", key: "performance" },
      { id: "section-trends",      key: "trends"      },
      { id: "section-correlation", key: "correlation" },
    ];
    const navLinks = document.querySelectorAll(".nav-link");

    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const matched = sections.find(s => s.id === entry.target.id);
          if (matched) {
            navLinks.forEach(link => link.classList.remove("active"));
            const activeLink = document.querySelector(`.nav-link[data-section="${matched.key}"]`);
            if (activeLink) {
              activeLink.classList.add("active");
            }
          }
        }
      });
    }, { threshold: 0.25 });

    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) spyObserver.observe(el);
    });
  }

})();
