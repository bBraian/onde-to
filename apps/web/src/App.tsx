import { BrowserRouter, Route, Routes } from 'react-router';
import { Home } from './pages/Home';
import { Training } from './pages/Training';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/treino" element={<Training />} />
      </Routes>
    </BrowserRouter>
  );
}
