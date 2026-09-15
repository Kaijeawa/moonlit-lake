export function WebGLFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <p>
        Moonlit Lake needs WebGL, which this browser or device doesn't
        support. Try a recent version of Chrome, Firefox, or Edge.
      </p>
    </div>
  )
}
