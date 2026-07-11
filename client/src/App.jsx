import { useEffect, useState } from 'react';
import Datapad from './components/student/Datapad.jsx';
import CommandCenter from './components/teacher/CommandCenter.jsx';

/**
 * Root shell. Two surfaces:
 *  - Student game (default route — embed this URL on the public Wix page)
 *  - Teacher Command Center (#teacher — embed on a password-protected Wix page)
 */
export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.startsWith('#teacher')) return <CommandCenter />;
  return <Datapad />;
}
