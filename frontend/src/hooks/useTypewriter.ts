import { useState, useEffect } from 'react';

export interface UseTypewriterReturn {
  displayed: string;
  done: boolean;
}

export function useTypewriter(
  text: string,
  speed: number = 38,
  startDelay: number = 600
): UseTypewriterReturn {
  const [displayed, setDisplayed] = useState<string>('');
  const [done, setDone] = useState<boolean>(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    let currentIndex = 0;
    let intervalId: number | undefined;

    const timeoutId = window.setTimeout(() => {
      if (text.length === 0) {
        setDone(true);
        return;
      }

      intervalId = window.setInterval(() => {
        currentIndex += 1;
        setDisplayed(text.slice(0, currentIndex));

        if (currentIndex >= text.length) {
          setDone(true);
          window.clearInterval(intervalId);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
