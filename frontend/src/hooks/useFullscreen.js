import { useCallback, useEffect, useState } from 'react';

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
}

async function requestFullscreen(element) {
  const request = element?.requestFullscreen || element?.webkitRequestFullscreen || element?.mozRequestFullScreen || element?.msRequestFullscreen;
  if (!request) {
    return false;
  }
  try {
    await request.call(element);
    return true;
  } catch {
    return false;
  }
}

async function leaveFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (!exit) {
    return false;
  }
  try {
    await exit.call(document);
    return true;
  } catch {
    return false;
  }
}

export function useFullscreen(elementRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(fullscreenElement() === elementRef.current);
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach((event) => document.addEventListener(event, handleChange));
    handleChange();
    return () => events.forEach((event) => document.removeEventListener(event, handleChange));
  }, [elementRef]);

  const enterFullscreen = useCallback(async () => {
    if (elementRef.current && fullscreenElement() !== elementRef.current) {
      await requestFullscreen(elementRef.current);
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(async () => {
    if (fullscreenElement()) {
      await leaveFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (fullscreenElement() === elementRef.current) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [elementRef, enterFullscreen, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}

export default useFullscreen;
