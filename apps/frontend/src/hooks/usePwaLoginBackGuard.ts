import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useStandaloneMode } from "./useStandaloneMode";

export function usePwaLoginBackGuard(enabled = true) {
  const location = useLocation();
  const { isStandalone } = useStandaloneMode();

  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams(location.search);
    const source = params.get("source");
    const isPwaSession = isStandalone || source?.startsWith("pwa");

    if (!isPwaSession) return;

    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const guardedState = {
      ...(window.history.state ?? {}),
      pwaLoginGuard: true,
    };

    window.history.replaceState(guardedState, "", currentUrl);
    window.history.pushState(guardedState, "", currentUrl);

    const keepLoginAsFirstScreen = () => {
      window.history.pushState(guardedState, "", currentUrl);
    };

    window.addEventListener("popstate", keepLoginAsFirstScreen);

    return () => {
      window.removeEventListener("popstate", keepLoginAsFirstScreen);
    };
  }, [enabled, isStandalone, location.hash, location.pathname, location.search]);
}
