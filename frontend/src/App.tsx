import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import BookingPage from "./pages/BookingPage";
import MyBookings from "./pages/MyBookings";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/booking/:showtimeId" element={<BookingPage />} />
            <Route path="/my-bookings" element={<MyBookings />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <div className="container text-center py-3">
            <small className="text-secondary">
              © {new Date().getFullYear()} CINEMA — Todos los derechos reservados
            </small>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
