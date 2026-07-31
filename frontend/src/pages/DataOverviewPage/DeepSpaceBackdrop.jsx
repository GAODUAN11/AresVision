import { DEEP_SPACE_BACKDROP_LAYERS } from './deepSpaceBackdropModel';

export default function DeepSpaceBackdrop() {
  return (
    <div className="overview-deep-space-backdrop" aria-hidden="true">
      {DEEP_SPACE_BACKDROP_LAYERS.map((layer) => (
        <div
          key={layer.id}
          className={`overview-deep-space-layer ${layer.className}`}
          aria-hidden={layer.ariaHidden ? 'true' : undefined}
          style={{ pointerEvents: layer.pointerEvents }}
        />
      ))}
    </div>
  );
}
