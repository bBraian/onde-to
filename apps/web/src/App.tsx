import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Home } from './pages/Home';
import { Local } from './pages/Local';
import { Room } from './pages/Room';
import { AvatarEditor } from './pages/AvatarEditor';
import { EASE_OUT, ROUTE_FADE_IN_S, ROUTE_FADE_OUT_S } from './lib/motion';

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
      <motion.div
        key={section}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: ROUTE_FADE_IN_S, ease: EASE_OUT } }}
        exit={{ opacity: 0, transition: { duration: ROUTE_FADE_OUT_S } }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/avatar" element={<AvatarEditor />} />
          <Route path="/local" element={<Local />} />
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
