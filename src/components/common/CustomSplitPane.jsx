import React, { useRef, useState, useLayoutEffect } from 'react';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Two-pane horizontal split (left/right).
 * Injects simple state/setters into children by cloning elements:
 *   { showLeft, setShowLeft, showRight, setShowRight, leftPct, setLeftPct, open*, close*, toggle* }
 *
 * Props:
 *   - left, right: ReactNode | (api) => ReactNode
 *   - initialLeft: number (percent, default 70)
 *   - minLeftPct/maxLeftPct: percent guards (default 15/85)
 *   - minLeftPx: hard pixel guard for left (default 560)
 *   - minRightPx: hard pixel guard for right (default 320)
 *   - dividerWidth: px (default 6)
 *   - className/style/height
 */
const CustomSplitPane = ({
  left,
  right,
  initialLeft = 70,
  minLeftPct = 15,
  maxLeftPct = 85,
  minLeftPx = 560,
  minRightPx = 320,
  dividerWidth = 6,
  height = '100%',
  className,
  style,
}) => {
  const containerRef = useRef(null);

  const [leftPct, _setLeftPct] = useState(initialLeft);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // Clamp leftPct when container size changes (respect px minimums)
  const setLeftPct = (pct) => {
    const w = containerRef.current?.clientWidth ?? 0;
    const minPctByPx = w ? Math.max(minLeftPx / w * 100, minLeftPct) : minLeftPct;
    const maxPctByPx = w ? Math.min(100 - (minRightPx / w * 100), maxLeftPct) : maxLeftPct;
    _setLeftPct(clamp(pct, minPctByPx, maxPctByPx));
  };

  useLayoutEffect(() => {
    // ensure initial within pixel guards
    setLeftPct(initialLeft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDivider = showLeft && showRight;

  const onDividerMouseDown = (e) => {
    if (!showDivider) return;
    e.preventDefault();
    const startX = e.clientX;
    const startPct = leftPct;

    const onMove = (me) => {
      const w = containerRef.current?.clientWidth ?? 1;
      const dx = me.clientX - startX;
      const deltaPct = (dx / w) * 100;

      const minPctByPx = Math.max(minLeftPct, (minLeftPx / w) * 100);
      const maxPctByPx = Math.min(maxLeftPct, 100 - (minRightPx / w) * 100);
      _setLeftPct(clamp(startPct + deltaPct, minPctByPx, maxPctByPx));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // API passed down
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
            flex: showDivider ? `0 0 calc(${leftPct}% - ${dividerWidth / 2}px)` : '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {renderChild(left)}
        </div>
      )}

      {showDivider && (
        <div
          className="split__divider"
          style={{
            width: dividerWidth,
            cursor: 'col-resize',
            userSelect: 'none',
            flex: `0 0 ${dividerWidth}px`,
          }}
          onMouseDown={onDividerMouseDown}
        />
      )}

      {showRight && (
        <div
          className="split__right"
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            overflow: 'hidden',
            position: 'relative',
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
};

export default CustomSplitPane;
