import { useRef, useCallback } from 'react';

/**
 * useTouchGestures - Hook para detectar gestos táctiles en móvil
 * Soporta: swipe, double-tap, long-press, pinch
 */
export default function useTouchGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onDoubleTap,
    onLongPress,
    onPinch,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
}) {
    const touchRef = useRef({
        startX: 0,
        startY: 0,
        startTime: 0,
        lastTapTime: 0,
        longPressTimer: null,
        initialDistance: 0,
        isLongPress: false,
    });

    const handleTouchStart = useCallback((e) => {
        const touch = e.touches[0];
        touchRef.current.startX = touch.clientX;
        touchRef.current.startY = touch.clientY;
        touchRef.current.startTime = Date.now();
        touchRef.current.isLongPress = false;

        // Detectar pinch (dos dedos)
        if (e.touches.length === 2 && onPinch) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchRef.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
        }

        // Configurar long press
        if (onLongPress) {
            touchRef.current.longPressTimer = setTimeout(() => {
                touchRef.current.isLongPress = true;
                onLongPress();
            }, longPressDelay);
        }
    }, [onLongPress, longPressDelay, onPinch]);

    const handleTouchMove = useCallback((e) => {
        // Cancelar long press si se mueve
        if (touchRef.current.longPressTimer) {
            clearTimeout(touchRef.current.longPressTimer);
            touchRef.current.longPressTimer = null;
        }

        // Detectar pinch
        if (e.touches.length === 2 && onPinch && touchRef.current.initialDistance > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scale = distance / touchRef.current.initialDistance;
            onPinch(scale);
        }
    }, [onPinch]);

    const handleTouchEnd = useCallback((e) => {
        const touch = e.changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const endTime = Date.now();

        // Cancelar long press
        if (touchRef.current.longPressTimer) {
            clearTimeout(touchRef.current.longPressTimer);
            touchRef.current.longPressTimer = null;
        }

        // No procesar si fue long press
        if (touchRef.current.isLongPress) return;

        const deltaX = endX - touchRef.current.startX;
        const deltaY = endY - touchRef.current.startY;

        // Detectar double tap
        const timeSinceLastTap = endTime - touchRef.current.lastTapTime;
        if (timeSinceLastTap < doubleTapDelay && onDoubleTap) {
            touchRef.current.lastTapTime = 0;
            onDoubleTap();
            return;
        }
        touchRef.current.lastTapTime = endTime;

        // Detectar swipe (solo si no hay pinch)
        if (touchRef.current.initialDistance === 0) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (Math.max(absX, absY) > swipeThreshold) {
                if (absX > absY) {
                    // Swipe horizontal
                    if (deltaX > 0 && onSwipeRight) {
                        onSwipeRight();
                    } else if (deltaX < 0 && onSwipeLeft) {
                        onSwipeLeft();
                    }
                } else {
                    // Swipe vertical
                    if (deltaY > 0 && onSwipeDown) {
                        onSwipeDown();
                    } else if (deltaY < 0 && onSwipeUp) {
                        onSwipeUp();
                    }
                }
            }
        }

        // Resetear pinch
        touchRef.current.initialDistance = 0;
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, swipeThreshold, doubleTapDelay]);

    const bind = useCallback((element) => {
        if (!element) return;
        
        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return { bind, touchRef };
}
