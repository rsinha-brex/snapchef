export const colors = {
  cream: '#FBF5EC',
  creamDeep: '#F4EADA',
  paper: '#FFFDF9',

  tc50: '#FAEDE4',
  tc100: '#F4D2BE',
  tc300: '#E89668',
  tc500: '#C9521B',
  tc600: '#A8420E',
  tc700: '#82310A',
  tc900: '#4A1B05',

  sage100: '#E6EBD8',
  sage300: '#B4BF8E',
  sage500: '#6F7D43',
  sage700: '#4A552A',

  saffron100: '#F8E4B8',
  saffron400: '#D9A23B',
  saffron600: '#A07515',

  ink: '#2A1F17',
  inkSoft: '#5A4A3B',
  inkHint: '#8A7868',
  inkMute: '#B5A693',

  hairline: 'rgba(42, 31, 23, 0.10)',
  hairlineStrong: 'rgba(42, 31, 23, 0.20)',
};

export const fonts = {
  display: 'Fraunces',
  body: 'Inter',
};

export const type = {
  h1: { fontFamily: 'Fraunces', fontSize: 32, fontWeight: '400' as const, letterSpacing: -0.64 },
  h2: { fontFamily: 'Fraunces', fontSize: 26, fontWeight: '400' as const, letterSpacing: -0.26 },
  h3: { fontFamily: 'Fraunces', fontSize: 22, fontWeight: '500' as const },
  body: { fontFamily: 'Inter', fontSize: 14, fontWeight: '400' as const },
  bodySm: { fontFamily: 'Inter', fontSize: 12, fontWeight: '400' as const },
  cap: { fontFamily: 'Inter', fontSize: 11, fontWeight: '500' as const, letterSpacing: 1.1, textTransform: 'uppercase' as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};
