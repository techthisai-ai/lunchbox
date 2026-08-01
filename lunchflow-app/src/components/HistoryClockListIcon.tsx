import Svg, { Circle, G, Line, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

/** Clock + list history icon — pure strokes, no background plate. */
export function HistoryClockListIcon({ size = 34, color = '#FFFFFF' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.95 18.2 A 8.2 8.2 0 1 1 18.2 16.95"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <G stroke={color} strokeWidth={2} strokeLinecap="round">
        <Line x1="12" y1="12" x2="12" y2="7.2" />
        <Line x1="12" y1="12" x2="15.5" y2="15.1" />
      </G>
      <Circle cx="12" cy="12" r="1.2" fill={color} />
      <G stroke={color} strokeWidth={2} strokeLinecap="round">
        <Line x1="14.7" y1="16.4" x2="20.6" y2="16.4" />
        <Line x1="14.7" y1="18.65" x2="20.6" y2="18.65" />
        <Line x1="14.7" y1="20.9" x2="20.6" y2="20.9" />
      </G>
    </Svg>
  );
}
