// src/components/common/CustomSplitPane.jsx
// Horizontal split layout (left/right) with draggable divider and min width guards.
// - Applies both % and px constraints to avoid panel cutoffs
// - Emits a small API to children (visibility toggles + sizes)
// - Uses ResizeObserver to keep constraints on container resize

import React, { useRef, useState, useLayoutEffect } from 'react';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const CustomSplitPane = ({
  left,
  right,
  initialLeft = 70,   // % width for left pane
  minLeftPct = 15,
  maxLeftPct = 85,
  minLeftPx = 560,    // hard minimum in px for left (prevents cutoff)
  minRightPx = 320,   // hard minimum in px for right
  dividerWidth = 6,
  height = '100%',
  className,
  style,
}) => {
  const containerRef = useRef(null);

  const [leftPct, _setLeftPct] = useState(initialLeft);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // clamp % using both % bounds and px guards
  const clampPct = (pct) => {
    const w = containerRef.current?.clientWidth ?? 0;
    const minPctByPx = w ? Math.max((minLeftPx / w) * 100, minLeftPct) : minLeftPct;
    const maxPctByPx = w ? Math.min(100 - (minRightPx / w) * 100, maxLeftPct) : maxLeftPct;
    return clamp(pct, minPctByPx, maxPctByPx);
  };
  const setLeftPct = (pct) => _setLeftPct(clampPct(pct));

  // initial clamp
  useLayoutEffect(() => { setLeftPct(initialLeft); }, []); // eslint-disable-line

  // keep layout valid on container resize
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => { _setLeftPct((p) => clampPct(p)); });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [minLeftPct, maxLeftPct, minLeftPx, minRightPx]);

  const showDivider = showLeft && showRight;

  // drag to resize
  const onDividerMouseDown = (e) => {
    if (!showDivider) return;
    e.preventDefault();
    const startX = e.clientX;
    const startPct = leftPct;

    const onMove = (me) => {
      const w = containerRef.current?.clientWidth ?? 1;
      const dx = me.clientX - startX;
      const deltaPct = (dx / w) * 100;
      _setLeftPct(clampPct(startPct + deltaPct));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // child API (injected via clone)
  const api = {
    showLeft, setShowLeft,
    showRight, setShowRight,
    leftPct, setLeftPct,
    openLeft: () => setShowLeft(true),
    closeLeft: () => setShowLeft(false),
    toggleLeft: () => setShowLeft((s) => !s),
    openRight: () => setShowRight(true),
    closeRight: () => setShowRight(false),
    toggleRight: () => setShowRight((s) => !s),
  };

  const renderChild = (child) => {
    if (typeof child === 'function') return child(api);
    if (React.isValidElement(child)) return React.cloneElement(child, api);
    return child;
  };

  return (
    <div
      ref={containerRef}
      className={`split ${className || ''}`}
      style={{ height, width: '100%', display: 'flex', minHeight: 0, ...style }}
    >
      {showLeft && (
        <div
          className="split__left"
          style={{
            // reserve divider width so visual widths match
            flex: showDivider ? `0 0 calc(${leftPct}% - ${dividerWidth / 2}px)` : '1 1 auto',
            minWidth: showDivider ? `${minLeftPx}px` : 0,
            overflow: 'auto',
            position: 'relative',
            minHeight: 0,
          }}
        >
          {renderChild(left)}
        </div>
      )}

      {showDivider && (
        <div
          className="split__divider"
          style={{ width: dividerWidth, cursor: 'col-resize', userSelect: 'none', flex: `0 0 ${dividerWidth}px` }}
          onMouseDown={onDividerMouseDown}
        />
      )}

      {showRight && (
        <div
          className="split__right"
          style={{
            flex: '1 1 auto',
            minWidth: showDivider ? `${minRightPx}px` : 0,
            overflow: 'auto',
            position: 'relative',
            minHeight: 0,
          }}
        >
          {renderChild(right)}
        </div>
      )}

      {!showLeft && !showRight && (
        <div className="split__recovery">
          <button onClick={() => setShowLeft(true)}>Show Left</button>
          <button onClick={() => setShowRight(true)}>Show Right</button>
        </div>
      )}
    </div>
  );
}

export default CustomSplitPane;