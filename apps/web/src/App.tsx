import { MotionConfig } from 'motion/react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Home } from './pages/Home';
import { Training } from './pages/Training';
import { Room } from './pages/Room';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/treino" element={<Training />} />
        <Route path="/sala/:code" element={<Room />} />
      </Routes>
    </BrowserRouter>
    </MotionConfig>
  );
}
