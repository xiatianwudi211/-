import { useEffect, useRef } from 'react'
import { MorphProvider, useMorph } from './tree/MorphContext'
import { TreeScene } from './tree/TreeScene'
import { TreeMorphState } from './tree/types'
import './styles.css'

function Overlay() {
  const { state, toggle, progress } = useMorph()
  const barRef = useRef<HTMLDivElement>(null)

  // Driven straight from the shared ref — no React re-render per frame.
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.current})`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [progress])

  const assembled = state === TreeMorphState.TREE_SHAPE

  return (
    <div className="overlay">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">ARIX</div>
          <div className="brand-sub">SIGNATURE&nbsp;&nbsp;·&nbsp;&nbsp;NOËL 2026</div>
        </div>
        <div className="header-meta">
          <span>ÉDITION LIMITÉE</span>
          <span className="hairline" />
          <span>01 / 01</span>
        </div>
      </header>

      <aside className="side-note">
        <span>EMERALD</span>
        <span className="diamond">◆</span>
        <span>GOLD</span>
        <span className="diamond">◆</span>
        <span>LIGHT</span>
      </aside>

      <footer className="footer">
        <div className="hint">拖拽旋转&nbsp;&nbsp;·&nbsp;&nbsp;滚轮缩放&nbsp;&nbsp;/&nbsp;&nbsp;DRAG TO ORBIT</div>

        <div className="dock">
          <div className="status">
            <span className={`status-dot ${assembled ? 'on' : ''}`} />
            <span className="status-text">{assembled ? 'ASSEMBLED' : 'IN ORBIT'}</span>
          </div>
          <div className="divider" />
          <button
            className="dock-btn active"
            onClick={toggle}
            aria-label={assembled ? '切换为散落状态' : '切换为圣诞树形态'}
          >
            <span className="btn-index toggle-icon">⇄</span>
            <span>{assembled ? '散落' : '成型'} <em>{assembled ? 'SCATTER' : 'ASSEMBLE'}</em></span>
          </button>
        </div>

        <div className="signature">THE ART OF LIGHT</div>
      </footer>

      <div className="progress-track">
        <div ref={barRef} className="progress-bar" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <MorphProvider>
      <main className="app">
        <TreeScene />
        <Overlay />
      </main>
    </MorphProvider>
  )
}
