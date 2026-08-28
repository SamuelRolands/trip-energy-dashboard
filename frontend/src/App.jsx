import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Predictor from "./pages/Predictor";
import ModelPerformance from "./pages/ModelPerformance";
import FeatureInsights from "./pages/FeatureInsights";
import TripMap from "./pages/TripMap";
import About from "./pages/About";

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<Predictor />} />
        <Route path="/performance" element={<ModelPerformance />} />
        <Route path="/insights" element={<FeatureInsights />} />
        <Route path="/trips" element={<TripMap />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
