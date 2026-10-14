    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#090d1a"/>
      <stop offset="1" stop-color="#141a30"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7c5cff" stop-opacity="0.42"/>
      <stop offset="0.6" stop-color="#2f81f7" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#2f81f7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="140" y1="170" x2="350" y2="340">
      <stop offset="0" stop-color="#5cf2a4"/>
      <stop offset="0.5" stop-color="#4cc3ff"/>
      <stop offset="1" stop-color="#b98cff"/>
    </linearGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#ffffff" fill-opacity="0.06"/>
    </pattern>
    <filter id="neon" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.75 0" result="soft"/>
      <feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
