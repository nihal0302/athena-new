import { useEffect, useRef, type RefObject } from 'react'

/** Keeps a scrolling panel following its newest content, but only while the reader stays at the bottom.
 *  If they scroll up to read something, it stops following until they scroll back down (or a new run starts). */
export function useFollow(ref: RefObject<HTMLElement | null>, active: boolean, trigger: string, reset: boolean) {
  const stick = useRef(true)
  const auto = useRef(false) // true while our own smooth scroll is moving the panel

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      if (auto.current) return
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [ref])

  useEffect(() => {
    if (reset) stick.current = true
  }, [reset])

  useEffect(() => {
    const el = ref.current
    if (!el || !active || !stick.current) return
    auto.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    window.setTimeout(() => {
      auto.current = false
    }, 800)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, active])
}

/** Follows a growing answer to the bottom of a scroll area, frame by frame, with a short ease so it never jumps.
 *  It stops following as soon as the reader scrolls up (wheel, touch, keys or dragging the bar) and picks up again
 *  when they come back to the bottom. `reset` re-arms it for a new run. */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, active: boolean, reset: boolean) {
  const stick = useRef(true)
  const last = useRef(0)

  useEffect(() => {
    if (reset) stick.current = true
  }, [reset])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const nearBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight < 40
    const up = () => {
      stick.current = false
    }
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) up()
    }
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) up()
    }
    let touchY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0
      if (y > touchY + 4) up() // finger moving down = reading earlier content
      touchY = y
    }
    const onScroll = () => {
      if (el.scrollTop < last.current - 6) up() // moved up by something other than our own easing
      else if (nearBottom()) stick.current = true
      last.current = el.scrollTop
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('keydown', onKey)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    let raf = 0
    const tick = () => {
      if (stick.current) {
        const target = el.scrollHeight - el.clientHeight
        const diff = target - el.scrollTop
        if (diff > 1) {
          el.scrollTop = el.scrollTop + Math.max(1, diff * 0.16)
          last.current = el.scrollTop
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, active])
}
