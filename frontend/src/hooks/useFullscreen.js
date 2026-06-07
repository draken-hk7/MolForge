import { useCallback, useEffect, useState } from 'react';

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
}

function requestFullscreen(element) {
  const request = element?.requestFullscreen || element?.webkitRequestFullscreen || element?.mozRequestFullScreen || element?.msRequestFullscreen;
  return request ? request.call(element) : Promise.reject(new Error('Fullscreen is not supported by this browser.'));
}

function leaveFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  return exit ? exit.call(document) : Promise.resolve();
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
