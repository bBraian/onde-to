import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Home } from './pages/Home';
import { Training } from './pages/Training';
import { Room } from './pages/Room';
import { AvatarEditor } from './pages/AvatarEditor';

/**
 * Troca de tela com esmaecimento curto (200 ms). Só opacidade: um transform no contêiner
 * prenderia os modais com position: fixed. A chave é o 1º segmento da rota, então
 * /sala/nova → /sala/K7QX não remonta a sala.
 */
function AnimatedRoutes() {
  const location = useLocation();
  const section = `/${location.pathname.split('/')[1] ?? ''}`;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={section} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/avatar" element={<AvatarEditor />} />
          <Route path="/local" element={<Training />} />
          <Route path="/treino" element={<Navigate to="/local" replace />} />
          <Route path="/sala/:code" element={<Room />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </MotionConfig>
  );
}
