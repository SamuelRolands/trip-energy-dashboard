import Plot from "react-plotly.js";

// Shared dark-theme defaults so every chart in the dashboard looks like part
// of one designed product, rather than each page reinventing Plotly's
// (very light-mode-default) styling from scratch.
const BASE_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "Inter, sans-serif", color: "#a3adc2", size: 12.5 },
  margin: { t: 20, r: 20, b: 48, l: 56 },
  xaxis: { gridcolor: "#1e2430", zerolinecolor: "#2a3140", linecolor: "#2a3140" },
  yaxis: { gridcolor: "#1e2430", zerolinecolor: "#2a3140", linecolor: "#2a3140" },
  legend: { bgcolor: "transparent", font: { color: "#a3adc2" } },
  hoverlabel: { bgcolor: "#171c26", bordercolor: "#2a3140", font: { color: "#eef1f6" } },
};

export default function Chart({ data, layout = {}, style, config }) {
  return (
    <Plot
      data={data}
      layout={{ ...BASE_LAYOUT, ...layout, xaxis: { ...BASE_LAYOUT.xaxis, ...layout.xaxis }, yaxis: { ...BASE_LAYOUT.yaxis, ...layout.yaxis } }}
      style={{ width: "100%", height: 360, ...style }}
      useResizeHandler
      config={{ displayModeBar: false, responsive: true, ...config }}
    />
  );
}
