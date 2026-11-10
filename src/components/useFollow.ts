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
