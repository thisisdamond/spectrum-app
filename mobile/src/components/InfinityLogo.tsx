import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

export function InfinityLogo({ size = 88 }: { size?: number }) {
  return (
    <Svg accessibilityLabel="Spectrum rainbow infinity logo" width={size} height={size} viewBox="0 0 88 88">
      <Rect width="88" height="88" rx="24" fill="#0A4DFF" />
      <Defs>
        <LinearGradient id="rainbow" x1="12" y1="44" x2="76" y2="44" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FF4B4B" />
          <Stop offset="0.2" stopColor="#FF9F1C" />
          <Stop offset="0.4" stopColor="#FFD166" />
          <Stop offset="0.6" stopColor="#06D6A0" />
          <Stop offset="0.8" stopColor="#118AB2" />
          <Stop offset="1" stopColor="#C790FF" />
        </LinearGradient>
      </Defs>
      <Path d="M18 44c0-11 7-18 16-18 12 0 17 18 26 18 6 0 10-5 10-11s-4-11-10-11c-9 0-14 18-26 18-9 0-16-7-16-18s7-18 16-18c15 0 22 28 26 28" transform="translate(0 11)" fill="none" stroke="url(#rainbow)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
