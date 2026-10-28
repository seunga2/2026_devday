import { CAMERA_LIMITS, CAMERA_PRESETS, type CameraPresetKey } from '../lib/camera'
import { useActiveCut, useStore } from '../store/store'
import { Button, Icon, Label, Segmented, Slider } from './ui'

export function CameraControls() {
  const camera = useActiveCut().camera
  const setCamera = useStore((s) => s.setCamera)
  const applyPreset = useStore((s) => s.applyCameraPreset)
  const reset = useStore((s) => s.resetCamera)
  const L = CAMERA_LIMITS
  const preset = (Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).find((k) => CAMERA_PRESETS[k].angle === camera.angle) ?? null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="camera" className="h-3.5 w-3.5" /> 카메라
          </span>
        </Label>
        <Button variant="ghost" className="-mt-1.5 px-2 py-1 text-[11px]" onClick={reset} title="초기 구도로 복원">
          <Icon name="reset" className="h-3.5 w-3.5" /> 초기 구도
        </Button>
      </div>
      <Segmented
        ariaLabel="카메라 방향 프리셋"
        value={preset}
        onChange={applyPreset}
        options={(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((k) => ({ value: k, label: CAMERA_PRESETS[k].label }))}
      />
      <Slider label="피사체 거리" unit="m" value={camera.distance} {...L.distance} onChange={(distance) => setCamera({ distance })} />
      <Slider label="카메라 높이" unit="m" digits={2} value={camera.height} {...L.height} onChange={(height) => setCamera({ height })} />
      <Slider label="수평 회전" unit="°" digits={0} value={camera.angle} {...L.angle} onChange={(angle) => setCamera({ angle })} />
      <Slider label="시선 높이" unit="m" digits={2} value={camera.targetHeight} {...L.targetHeight} onChange={(targetHeight) => setCamera({ targetHeight })} />
      <Slider label="화각 (FOV)" unit="°" digits={0} value={camera.fov} {...L.fov} onChange={(fov) => setCamera({ fov })} />
    </div>
  )
}
