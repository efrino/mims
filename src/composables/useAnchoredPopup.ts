export type AnchoredPopupPosition = {
  top: number;
  left: number;
  maxHeight: number;
};

export type AnchoredPopupOptions = {
  popupWidth: number;
  preferredHeight: number;
  minimumHeight?: number;
  gap?: number;
  viewportPadding?: number;
};

type PositionUpdater = (
  trigger: HTMLElement
) => void;

type ActiveAnchor = {
  trigger: HTMLElement;
  updatePosition: PositionUpdater;
};

const getViewportBounds = () => {
  const visualViewport = window.visualViewport;
  const left = visualViewport?.offsetLeft ?? 0;
  const top = visualViewport?.offsetTop ?? 0;
  const width = visualViewport?.width ?? window.innerWidth;
  const height = visualViewport?.height ?? window.innerHeight;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height
  };
};

export const getAnchoredPopupPosition = (
  trigger: HTMLElement,
  options: AnchoredPopupOptions
): AnchoredPopupPosition => {
  const rect = trigger.getBoundingClientRect();
  const viewport = getViewportBounds();
  const gap = options.gap ?? 6;
  const viewportPadding = options.viewportPadding ?? 8;
  const minimumHeight = options.minimumHeight ?? 120;
  const minimumLeft = viewport.left + viewportPadding;
  const maximumLeft = Math.max(
    minimumLeft,
    viewport.right - options.popupWidth - viewportPadding
  );
  let left = rect.left;

  if (
    left + options.popupWidth >
    viewport.right - viewportPadding
  ) {
    left = rect.right - options.popupWidth;
  }

  left = Math.min(
    Math.max(left, minimumLeft),
    maximumLeft
  );

  const belowTop = rect.bottom + gap;
  const aboveBottom = rect.top - gap;
  const availableBelow = Math.max(
    0,
    viewport.bottom - belowTop - viewportPadding
  );
  const availableAbove = Math.max(
    0,
    aboveBottom - viewport.top - viewportPadding
  );
  const openAbove =
    availableBelow < Math.min(options.preferredHeight, 180) &&
    availableAbove > availableBelow;
  const availableHeight = openAbove
    ? availableAbove
    : availableBelow;
  const maxHeight = Math.max(
    minimumHeight,
    Math.min(options.preferredHeight, availableHeight)
  );
  const top = openAbove
    ? Math.max(
      viewport.top + viewportPadding,
      aboveBottom - maxHeight
    )
    : Math.max(
      viewport.top + viewportPadding,
      belowTop
    );

  return {
    top,
    left,
    maxHeight
  };
};

export const useAnchoredPopup = (
  onAnchorHidden: () => void
) => {
  let activeAnchor: ActiveAnchor | null = null;
  let animationFrame: number | null = null;
  let listenersAttached = false;

  const detachListeners = (): void => {
    if (
      !listenersAttached ||
      typeof window === 'undefined'
    ) {
      return;
    }

    window.removeEventListener('scroll', scheduleUpdate, true);
    window.removeEventListener('resize', scheduleUpdate);
    window.visualViewport?.removeEventListener(
      'scroll',
      scheduleUpdate
    );
    window.visualViewport?.removeEventListener(
      'resize',
      scheduleUpdate
    );
    listenersAttached = false;
  };

  const clear = (): void => {
    activeAnchor = null;

    if (
      animationFrame !== null &&
      typeof window !== 'undefined'
    ) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    detachListeners();
  };

  const update = (): void => {
    const anchor = activeAnchor;

    if (!anchor) {
      return;
    }

    if (!anchor.trigger.isConnected) {
      clear();
      onAnchorHidden();
      return;
    }

    const rect = anchor.trigger.getBoundingClientRect();
    const viewport = getViewportBounds();
    const isOutsideViewport =
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.right <= viewport.left ||
      rect.left >= viewport.right ||
      rect.bottom <= viewport.top ||
      rect.top >= viewport.bottom;

    if (isOutsideViewport) {
      clear();
      onAnchorHidden();
      return;
    }

    anchor.updatePosition(anchor.trigger);
  };

  function scheduleUpdate(): void {
    if (
      typeof window === 'undefined' ||
      activeAnchor === null ||
      animationFrame !== null
    ) {
      return;
    }

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = null;
      update();
    });
  }

  const attachListeners = (): void => {
    if (
      listenersAttached ||
      typeof window === 'undefined'
    ) {
      return;
    }

    window.addEventListener('scroll', scheduleUpdate, {
      capture: true,
      passive: true
    });
    window.addEventListener('resize', scheduleUpdate, {
      passive: true
    });
    window.visualViewport?.addEventListener(
      'scroll',
      scheduleUpdate,
      { passive: true }
    );
    window.visualViewport?.addEventListener(
      'resize',
      scheduleUpdate,
      { passive: true }
    );
    listenersAttached = true;
  };

  const anchor = (
    trigger: HTMLElement,
    updatePosition: PositionUpdater
  ): void => {
    clear();
    activeAnchor = {
      trigger,
      updatePosition
    };
    attachListeners();
    updatePosition(trigger);
  };

  return {
    anchor,
    clear,
    update
  };
};
