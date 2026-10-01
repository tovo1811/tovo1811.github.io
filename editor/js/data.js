/* Statische Daten für den Grafik-Editor: Formate, Schriften, Farben, Formen, Vorlagen. */
(function () {
  'use strict';

  const FORMATS = [
    { id: 'instagram-post', name: 'Instagram-Beitrag', w: 1080, h: 1080 },
    { id: 'instagram-portrait', name: 'Instagram Hochformat', w: 1080, h: 1350 },
    { id: 'story', name: 'Story / Reel', w: 1080, h: 1920 },
    { id: 'facebook-post', name: 'Facebook-Beitrag', w: 1200, h: 630 },
    { id: 'youtube-thumbnail', name: 'YouTube-Thumbnail', w: 1280, h: 720 },
    { id: 'presentation', name: 'Präsentation 16:9', w: 1920, h: 1080 },
    { id: 'pinterest', name: 'Pinterest-Pin', w: 1000, h: 1500 },
    { id: 'flyer-a4', name: 'Flyer A4', w: 1240, h: 1754 },
    { id: 'business-card', name: 'Visitenkarte', w: 1050, h: 600 },
    { id: 'logo', name: 'Logo', w: 500, h: 500 },
  ];

  // spec: Google-Fonts css2 "family=" Wert. Schriften mit nur einem Schnitt haben keine Achsen,
  // sonst lehnt die API die Anfrage ab.
  const FONTS = [
    { name: 'Inter', spec: 'Inter:wght@400;700' },
    { name: 'Roboto', spec: 'Roboto:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'Montserrat', spec: 'Montserrat:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'Poppins', spec: 'Poppins:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'Open Sans', spec: 'Open+Sans:wght@400;700' },
    { name: 'Lato', spec: 'Lato:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'Oswald', spec: 'Oswald:wght@400;700' },
    { name: 'Raleway', spec: 'Raleway:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'Space Grotesk', spec: 'Space+Grotesk:wght@400;700' },
    { name: 'Comfortaa', spec: 'Comfortaa:wght@400;700' },
    { name: 'Playfair Display', spec: 'Playfair+Display:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'Merriweather', spec: 'Merriweather:wght@400;700' },
    { name: 'Lora', spec: 'Lora:ital,wght@0,400;0,700;1,400;1,700' },
    { name: 'DM Serif Display', spec: 'DM+Serif+Display' },
    { name: 'Abril Fatface', spec: 'Abril+Fatface' },
    { name: 'Bebas Neue', spec: 'Bebas+Neue' },
    { name: 'Anton', spec: 'Anton' },
    { name: 'Archivo Black', spec: 'Archivo+Black' },
    { name: 'Righteous', spec: 'Righteous' },
    { name: 'Lobster', spec: 'Lobster' },
    { name: 'Pacifico', spec: 'Pacifico' },
    { name: 'Dancing Script', spec: 'Dancing+Script:wght@400;700' },
    { name: 'Caveat', spec: 'Caveat:wght@400;700' },
    { name: 'Permanent Marker', spec: 'Permanent+Marker' },
    { name: 'Shadows Into Light', spec: 'Shadows+Into+Light' },
    { name: 'Courier Prime', spec: 'Courier+Prime:ital,wght@0,400;0,700;1,400;1,700' },
  ];

  const COLORS = [
    '#000000', '#545454', '#737373', '#a6a6a6', '#d9d9d9', '#ffffff',
    '#ff3131', '#ff5757', '#ff66c4', '#cb6ce6', '#8c52ff', '#5e17eb',
    '#0097b2', '#0cc0df', '#5ce1e6', '#38b6ff', '#5271ff', '#004aad',
    '#00bf63', '#7ed957', '#c1ff72', '#ffde59', '#ffbd59', '#ff914d',
  ];

  const GRADIENTS = [
    ['#ff9a9e', '#fad0c4'], ['#a18cd1', '#fbc2eb'], ['#fbc2eb', '#a6c1ee'],
    ['#84fab0', '#8fd3f4'], ['#f6d365', '#fda085'], ['#ff6a00', '#ee0979'],
    ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'],
    ['#30cfd0', '#330867'], ['#667eea', '#764ba2'], ['#0f2027', '#2c5364'],
    ['#8e2de2', '#4a00e0'], ['#f12711', '#f5af19'], ['#000000', '#434343'],
    ['#7d2ae8', '#00c4cc'],
  ];

  function regularPolygon(n, r, rotation) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rotation + (i * 2 * Math.PI) / n;
      pts.push({ x: r + r * Math.cos(a), y: r + r * Math.sin(a) });
    }
    return pts;
  }

  function star(points, outer, inner) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      pts.push({ x: outer + r * Math.cos(a), y: outer + r * Math.sin(a) });
    }
    return pts;
  }

  function polySvg(pts) {
    return 'M' + pts.map(p => p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' L') + ' Z';
  }

  // Alle Formen sind auf eine 100x100-Box normiert; "path" dient gleichzeitig als Vorschau.
  const SHAPES = [
    { id: 'rect', name: 'Quadrat', kind: 'rect' },
    { id: 'rounded', name: 'Abgerundet', kind: 'rect', rx: 18 },
    { id: 'circle', name: 'Kreis', kind: 'circle' },
    { id: 'triangle', name: 'Dreieck', kind: 'triangle' },
    { id: 'diamond', name: 'Raute', kind: 'polygon', points: [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }] },
    { id: 'pentagon', name: 'Fünfeck', kind: 'polygon', points: regularPolygon(5, 50, -Math.PI / 2) },
    { id: 'hexagon', name: 'Sechseck', kind: 'polygon', points: regularPolygon(6, 50, 0) },
    { id: 'octagon', name: 'Achteck', kind: 'polygon', points: regularPolygon(8, 50, Math.PI / 8) },
    { id: 'star', name: 'Stern', kind: 'polygon', points: star(5, 50, 21) },
    { id: 'burst', name: 'Siegel', kind: 'polygon', points: star(12, 50, 40) },
    { id: 'heart', name: 'Herz', kind: 'path', path: 'M50 92 C22 72 0 52 0 30 C0 13 12 2 27 2 C38 2 46 8 50 17 C54 8 62 2 73 2 C88 2 100 13 100 30 C100 52 78 72 50 92 Z' },
    { id: 'arrow', name: 'Pfeil', kind: 'path', path: 'M0 34 L58 34 L58 10 L100 50 L58 90 L58 66 L0 66 Z' },
    { id: 'bubble', name: 'Sprechblase', kind: 'path', path: 'M12 6 L88 6 Q100 6 100 18 L100 60 Q100 72 88 72 L42 72 L20 94 L24 72 L12 72 Q0 72 0 60 L0 18 Q0 6 12 6 Z' },
    { id: 'plus', name: 'Kreuz', kind: 'path', path: 'M35 0 L65 0 L65 35 L100 35 L100 65 L65 65 L65 100 L35 100 L35 65 L0 65 L0 35 L35 35 Z' },
    { id: 'arch', name: 'Bogen', kind: 'path', path: 'M0 100 L0 50 C0 22 22 0 50 0 C78 0 100 22 100 50 L100 100 Z' },
    { id: 'blob', name: 'Blob', kind: 'path', path: 'M78 12 C94 24 100 46 94 66 C88 86 68 100 46 98 C24 96 4 82 1 60 C-2 38 10 16 30 6 C48 -3 64 2 78 12 Z' },
    { id: 'ring', name: 'Ring', kind: 'circle', outline: true },
    { id: 'frame', name: 'Rahmen', kind: 'rect', outline: true },
  ];
  SHAPES.forEach(s => {
    if (s.kind === 'polygon') s.preview = polySvg(s.points);
    else if (s.kind === 'path') s.preview = s.path;
    else if (s.kind === 'circle') s.preview = 'M50 0 A50 50 0 1 1 49.99 0 Z';
    else if (s.kind === 'triangle') s.preview = 'M50 0 L100 100 L0 100 Z';
    else if (s.rx) s.preview = 'M18 0 L82 0 Q100 0 100 18 L100 82 Q100 100 82 100 L18 100 Q0 100 0 82 L0 18 Q0 0 18 0 Z';
    else s.preview = 'M0 0 L100 0 L100 100 L0 100 Z';
  });

  const LINES = [
    { id: 'line', name: 'Linie', dash: null },
    { id: 'dashed', name: 'Gestrichelt', dash: [24, 14] },
    { id: 'dotted', name: 'Gepunktet', dash: [2, 14], round: true },
    { id: 'arrow-line', name: 'Pfeil', arrow: true },
  ];

  const EMOJIS = [
    '😀', '😂', '😍', '🥳', '😎', '🤩', '😇', '🤔', '😱', '🥰', '👍', '👏', '🙌', '💪', '🙏', '✌️',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯', '🔥', '✨', '⭐', '🌟', '⚡', '💥', '🎉', '🎊',
    '🎁', '🎈', '🎂', '🏆', '🥇', '📣', '📌', '📍', '✅', '❌', '⚠️', '💡', '📷', '🎵', '🛒', '💰',
    '🌸', '🌻', '🌴', '🌈', '☀️', '🌙', '❄️', '🍕', '🍔', '☕', '🍹', '⚽', '🚀', '✈️', '🏠', '🐶',
  ];

  /*
   * Vorlagen in relativen Einheiten, damit sie zu jedem Format passen:
   * x/y = Mittelpunkt als Anteil von Breite/Höhe, w/h = Anteil von Breite/Höhe,
   * size/r = Anteil der kürzeren Seite.
   */
  const TEMPLATES = [
    {
      id: 'sale', name: 'Sale',
      bg: { gradient: ['#ff6a00', '#ee0979'], angle: 135 },
      items: [
        { t: 'circle', x: 0.88, y: 0.12, r: 0.22, fill: '#ffffff', opacity: 0.15 },
        { t: 'circle', x: 0.08, y: 0.92, r: 0.3, fill: '#ffffff', opacity: 0.12 },
        { t: 'text', text: 'MEGA', x: 0.5, y: 0.25, w: 0.9, size: 0.09, font: 'Montserrat', weight: 'bold', fill: '#ffffff', charSpacing: 600 },
        { t: 'text', text: 'SALE', x: 0.5, y: 0.43, w: 0.95, size: 0.28, font: 'Anton', fill: '#ffffff' },
        { t: 'text', text: 'Bis zu 50 % Rabatt auf alles', x: 0.5, y: 0.62, w: 0.85, size: 0.055, font: 'Montserrat', fill: '#ffffff' },
        { t: 'rect', x: 0.5, y: 0.78, w: 0.46, hh: 0.1, rx: 0.05, fill: '#ffffff' },
        { t: 'text', text: 'JETZT SHOPPEN', x: 0.5, y: 0.78, w: 0.46, size: 0.045, font: 'Montserrat', weight: 'bold', fill: '#ee0979' },
      ],
    },
    {
      id: 'quote', name: 'Zitat',
      bg: { color: '#f6f1e9' },
      items: [
        { t: 'text', text: '“', x: 0.5, y: 0.22, w: 0.5, size: 0.35, font: 'Playfair Display', fill: '#c9a227' },
        { t: 'text', text: 'Die beste Zeit, einen Baum zu pflanzen, war vor zwanzig Jahren. Die zweitbeste ist jetzt.', x: 0.5, y: 0.5, w: 0.78, size: 0.065, font: 'Playfair Display', style: 'italic', fill: '#2b2b2b', lineHeight: 1.25 },
        { t: 'rect', x: 0.5, y: 0.73, w: 0.12, hh: 0.006, fill: '#c9a227' },
        { t: 'text', text: 'CHINESISCHES SPRICHWORT', x: 0.5, y: 0.8, w: 0.8, size: 0.032, font: 'Montserrat', fill: '#6b6b6b', charSpacing: 300 },
      ],
    },
    {
      id: 'event', name: 'Event',
      bg: { color: '#14143c' },
      items: [
        { t: 'circle', x: 0.5, y: 0.36, r: 0.33, fill: { gradient: ['#ffbd59', '#ff5757'], angle: 180 } },
        { t: 'text', text: 'SOMMER', x: 0.5, y: 0.66, w: 0.9, size: 0.17, font: 'Bebas Neue', fill: '#ffffff', charSpacing: 100 },
        { t: 'text', text: 'FESTIVAL 2026', x: 0.5, y: 0.78, w: 0.9, size: 0.06, font: 'Montserrat', weight: 'bold', fill: '#ffbd59', charSpacing: 400 },
        { t: 'text', text: 'Sa, 18. Juli · Stadtpark · Eintritt frei', x: 0.5, y: 0.88, w: 0.9, size: 0.035, font: 'Montserrat', fill: '#c7c7e6' },
      ],
    },
    {
      id: 'minimal', name: 'Minimal',
      bg: { color: '#ffffff' },
      items: [
        { t: 'rect', x: 0.5, y: 0.5, w: 0.88, hh: 0.88, fill: 'transparent', stroke: '#111111', strokeWidth: 0.004 },
        { t: 'text', text: 'Weniger ist mehr.', x: 0.5, y: 0.45, w: 0.75, size: 0.1, font: 'DM Serif Display', fill: '#111111' },
        { t: 'text', text: 'Klares Design für klare Botschaften', x: 0.5, y: 0.58, w: 0.7, size: 0.038, font: 'Inter', fill: '#666666' },
      ],
    },
    {
      id: 'neon', name: 'Neon',
      bg: { color: '#0b0b12' },
      items: [
        { t: 'text', text: 'OPEN', x: 0.5, y: 0.4, w: 0.9, size: 0.25, font: 'Righteous', fill: '#ff4fd8', shadow: { color: '#ff4fd8', blur: 0.05 } },
        { t: 'text', text: 'LATE NIGHT', x: 0.5, y: 0.6, w: 0.9, size: 0.09, font: 'Righteous', fill: '#4ff0ff', charSpacing: 300, shadow: { color: '#4ff0ff', blur: 0.04 } },
      ],
    },
    {
      id: 'announcement', name: 'Ankündigung',
      bg: { gradient: ['#667eea', '#764ba2'], angle: 160 },
      items: [
        { t: 'rect', x: 0.5, y: 0.2, w: 0.2, hh: 0.075, rx: 0.04, fill: '#ffde59' },
        { t: 'text', text: 'NEU', x: 0.5, y: 0.2, w: 0.2, size: 0.045, font: 'Poppins', weight: 'bold', fill: '#3b1e6e' },
        { t: 'text', text: 'Unsere App ist da!', x: 0.5, y: 0.42, w: 0.85, size: 0.11, font: 'Poppins', weight: 'bold', fill: '#ffffff', lineHeight: 1.05 },
        { t: 'text', text: 'Entdecke alle neuen Funktionen und lade sie jetzt kostenlos herunter.', x: 0.5, y: 0.64, w: 0.75, size: 0.042, font: 'Poppins', fill: '#ece6ff', lineHeight: 1.3 },
        { t: 'emoji', text: '🚀', x: 0.5, y: 0.83, size: 0.12 },
      ],
    },
    {
      id: 'birthday', name: 'Geburtstag',
      bg: { color: '#fff4f6' },
      items: [
        { t: 'circle', x: 0.12, y: 0.12, r: 0.05, fill: '#ffbd59' },
        { t: 'circle', x: 0.85, y: 0.18, r: 0.035, fill: '#5ce1e6' },
        { t: 'circle', x: 0.9, y: 0.82, r: 0.06, fill: '#ff66c4' },
        { t: 'circle', x: 0.16, y: 0.86, r: 0.04, fill: '#8c52ff' },
        { t: 'emoji', text: '🎂', x: 0.5, y: 0.26, size: 0.16 },
        { t: 'text', text: 'Happy Birthday', x: 0.5, y: 0.5, w: 0.9, size: 0.13, font: 'Pacifico', fill: '#e83e8c' },
        { t: 'text', text: 'Alles Liebe zum Geburtstag, Lisa!', x: 0.5, y: 0.68, w: 0.8, size: 0.045, font: 'Comfortaa', weight: 'bold', fill: '#5a4a6a' },
      ],
    },
    {
      id: 'business', name: 'Business',
      bg: { color: '#f3f5f9' },
      items: [
        { t: 'rect', x: 0.2, y: 0.5, w: 0.4, hh: 1, fill: '#0f2b5b' },
        { t: 'text', text: 'Webinar', x: 0.2, y: 0.45, w: 0.34, size: 0.07, font: 'Space Grotesk', weight: 'bold', fill: '#ffffff' },
        { t: 'text', text: 'Live · 19 Uhr', x: 0.2, y: 0.55, w: 0.34, size: 0.035, font: 'Space Grotesk', fill: '#8fb3ff' },
        { t: 'text', text: 'Wachstum mit Strategie', x: 0.7, y: 0.42, w: 0.52, size: 0.07, font: 'Space Grotesk', weight: 'bold', fill: '#0f2b5b', align: 'left', lineHeight: 1.1 },
        { t: 'text', text: '5 Methoden, mit denen kleine Teams große Ziele erreichen.', x: 0.7, y: 0.6, w: 0.52, size: 0.035, font: 'Inter', fill: '#4a5670', align: 'left', lineHeight: 1.35 },
      ],
    },
  ];

  // Text-Kombinationen für den Text-Tab (gleiche Einheiten wie Vorlagen, relativ zur Seite).
  const TEXT_PRESETS = [
    { label: 'Überschrift hinzufügen', css: 'font: 700 22px Inter, sans-serif', items: [{ t: 'text', text: 'Überschrift', size: 0.09, w: 0.8, font: 'Inter', weight: 'bold' }] },
    { label: 'Unterüberschrift hinzufügen', css: 'font: 600 16px Inter, sans-serif', items: [{ t: 'text', text: 'Unterüberschrift', size: 0.055, w: 0.7, font: 'Inter', weight: 'bold' }] },
    { label: 'Fließtext hinzufügen', css: 'font: 400 13px Inter, sans-serif', items: [{ t: 'text', text: 'Hier steht dein Text. Doppelt tippen zum Bearbeiten.', size: 0.035, w: 0.6, font: 'Inter', lineHeight: 1.3 }] },
  ];

  const TEXT_COMBOS = [
    { id: 'c1', items: [
      { t: 'text', text: 'BIG SALE', y: -0.04, size: 0.14, w: 0.8, font: 'Anton', fill: '#111111' },
      { t: 'text', text: 'nur dieses Wochenende', y: 0.06, size: 0.04, w: 0.8, font: 'Montserrat', fill: '#ff3131', charSpacing: 200 },
    ] },
    { id: 'c2', items: [
      { t: 'text', text: 'Hello', y: -0.03, size: 0.13, w: 0.8, font: 'Pacifico', fill: '#e83e8c' },
      { t: 'text', text: 'SUNSHINE', y: 0.07, size: 0.05, w: 0.8, font: 'Montserrat', weight: 'bold', fill: '#ffbd59', charSpacing: 500 },
    ] },
    { id: 'c3', items: [
      { t: 'text', text: 'Elegant', y: -0.03, size: 0.11, w: 0.8, font: 'Playfair Display', style: 'italic', fill: '#2b2b2b' },
      { t: 'text', text: 'SEIT 1998', y: 0.06, size: 0.035, w: 0.8, font: 'Lato', fill: '#8a7a50', charSpacing: 600 },
    ] },
    { id: 'c4', items: [
      { t: 'text', text: 'NEON', y: 0, size: 0.15, w: 0.8, font: 'Righteous', fill: '#4ff0ff', shadow: { color: '#4ff0ff', blur: 0.04 } },
    ] },
    { id: 'c5', items: [
      { t: 'text', text: 'OUTLINE', y: 0, size: 0.13, w: 0.9, font: 'Archivo Black', fill: 'transparent', stroke: '#111111', strokeWidth: 0.004 },
    ] },
    { id: 'c6', items: [
      { t: 'text', text: 'notiz to self', y: 0, size: 0.09, w: 0.8, font: 'Caveat', weight: 'bold', fill: '#5271ff' },
    ] },
  ];

  window.EditorData = { FORMATS, FONTS, COLORS, GRADIENTS, SHAPES, LINES, EMOJIS, TEMPLATES, TEXT_PRESETS, TEXT_COMBOS };
})();
