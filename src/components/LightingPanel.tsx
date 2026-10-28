import type { LightingPreset, Tone } from '../types/scene'
import { LIGHTING_PRESETS, LIGHT_LIMITS, TONES } from '../lib/lighting'
import { useActiveCut, useStore } from '../store/store'
import { Icon, Label, Segmented, Slider } from './ui'

export function LightingPanel() {
  const lighting = useActiveCut().lighting
  const setLighting = useStore((s) => s.setLighting)
  const applyPreset = useStore((s) => s.applyLightingPreset)

  return (
    <div className="space-y-3">
      <Label>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="light" className="h-3.5 w-3.5" /> 조명
        </span>
      </Label>
      <Segmented
        ariaLabel="조명 프리셋"
        value={lighting.preset}
        onChange={applyPreset}
        options={(Object.keys(LIGHTING_PRESETS) as LightingPreset[]).map((k) => ({ value: k, label: LIGHTING_PRESETS[k].label }))}
      />
      <Slider label="밝기" value={lighting.intensity} {...LIGHT_LIMITS.intensity} onChange={(intensity) => setLighting({ intensity })} />
      <Slider label="조명 방향" unit="°" digits={0} value={lighting.direction} {...LIGHT_LIMITS.direction} onChange={(direction) => setLighting({ direction })} />
      <div>
        <div className="mb-1 text-[12px] text-soft">색온도</div>
        <Segmented
          ariaLabel="색온도"
          value={lighting.tone}
          onChange={(tone) => setLighting({ tone })}
          options={(Object.keys(TONES) as Tone[]).map((k) => ({
            value: k,
            label: (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: TONES[k].color }} />
                {TONES[k].label}
              </span>
            ),
            title: `${TONES[k].kelvin}K`,
          }))}
        />
      </div>
    </div>
  )
}
