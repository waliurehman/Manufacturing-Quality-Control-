# 🛡️ ApexQC – Manufacturing Quality Control Dashboard

**Data Visualization Semester Project (DSC327)**  
**Wali Ur Rehman** (SP23-BDS-054) · **Khadija Jumani** (SP23-BDS-023)  
COMSATS University Islamabad · Semester 7  

---

## 📋 Project Overview

ApexQC is a fully interactive, web-based analytics dashboard built with D3.js and HTML5/CSS3. It is designed to monitor and optimize quality control metrics across three manufacturing plants: **Lahore**, **Islamabad**, and **Karachi**. 

By processing 5,000 quality control records spanning 2023–2024, the dashboard provides interactive tools to explore:
* Production yields, good vs. defective units, and defect rates.
* Financial impacts of scrap cost losses.
* Operational downtime by shift.
* Product yield rankings and individual machine efficiencies.
* Seasonal and monthly trends.
* Process correlations (Temperature and Pressure effects on Efficiency and Defect Rates).

---

## 🚀 Getting Started

The application must be run through a local web server because D3 loads the CSV data via relative paths. Opening `index.html` directly in the browser (`file://`) will trigger a CORS error.

### Option 1: VS Code Live Server (Recommended)
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code.
2. Open the project folder in VS Code.
3. Right-click `index.html` and select **Open with Live Server**.
4. The dashboard will launch in your browser at `http://127.0.0.1:5500`.

### Option 2: Python HTTP Server
Run the following command in the project directory:
```bash
python -m http.server 8080
```
Then visit: `http://localhost:8080` in your web browser.

### Option 3: Node.js
Run:
```bash
npx serve .
```
Then open the URL shown in your terminal.

---

## 📁 Codebase Structure

```
LabFinal/
├── index.html                  # Main layout and dashboard structure
├── Manufacturing_QC_Data.csv   # Pre-processed dataset (5,000 runs)
├── css/
│   └── style.css               # Responsive styling & dark industrial design system
├── js/
│   ├── utils.js                # Common formatting, tooltips, and color settings
│   ├── dataLoader.js           # CSV parsing and D3 data grouping/aggregations
│   ├── dashboard.js            # KPIs and dynamic Defect Type Donut Chart
│   ├── performance.js          # Machine comparative bars & Product defect rankings
│   ├── trends.js               # Monthly trend lines with Timeline Brush Zoom
│   ├── correlation.js          # Environmental Scatter Plot with axis toggles
│   └── main.js                 # Loader management, scroll spy, and app bootstrap
└── README.md
```

---

## 📊 Visualizations & Interactive Features

### 1. Plant Yield & Defect Dashboard
* **Toggle Controls**: Filter all views by plant (**All Plants**, **Islamabad**, **Karachi**, **Lahore**).
* **Yield Metrics**: Dynamic KPI cards displaying overall yield, good vs. defective counts, scrap costs, and downtime.
* **Defect Proportions**: A dynamic D3 donut chart that transitions to show the percentage breakdown of defects (Material Defect, Assembly Fault, Dimensional Error, Surface Crack) with arc hover expansions.

### 2. Performance Rankings
* **Product Defect Rankings**: A sorted horizontal bar chart showing defect rates by product (Brake Disc, Engine Parts, etc.). Toggling the **Sort** button reverses the sorting order.
* **Machine Comparative Bar Chart**: Displays machine-level metrics (M-101 to M-105). Users can compare **Yield vs. Defect Rate** side-by-side or isolate either metric.

### 3. Temporal Trends
* **Dual-Axis Line Chart**: Plots Monthly Average Defect Rate (left axis, red line) against Machine Efficiency (right axis, green line) over time.
* **Timeline Brush Zoom**: Drag handles on the mini timeline chart at the bottom to zoom in on specific production windows. Dragging updates the main trend line chart smoothly.

### 4. Process Parameter Correlations
* **Scatter Analysis**: Plots environmental run profiles. Dropdowns allow users to change the X-axis (Temperature, Pressure, Produced, Downtime) and Y-axis (Defect Rate, Efficiency, Downtime, Scrap Cost).
* **Shift Coloring**: Points are color-coded by Shift (Morning/Evening/Night) or Factory Plant to reveal operating window clusters.

---

## 👥 Authors & Roles

* **Wali Ur Rehman** (SP23-BDS-054): Code Architecture, Trends line chart with Brush, Parameter scatter plot, Data loaders, and Git management.
* **Khadija Jumani** (SP23-BDS-023): UI Design, Factory Donut chart, Machine & Product performance bars, and Report documentation.
