import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Dashboard from "./pages/Dashboard";
import NewVehicle from "./pages/NewVehicle";
import VehicleDetails from "./pages/VehicleDetails";
import CustomerTracking from "./pages/CustomerTracking";
import Customers from "./pages/Customers";
import Technicians from "./pages/Technicians";
import AIAssistant from "./pages/AIAssistant";
import Analytics from "./pages/Analytics";
import PartsInventory from "./pages/PartsInventory";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-vehicle" element={<NewVehicle />} />
          <Route path="/vehicle/:id" element={<VehicleDetails />} />
          <Route path="/track/:trackingId" element={<CustomerTracking />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/technicians" element={<Technicians />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/parts" element={<PartsInventory />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
