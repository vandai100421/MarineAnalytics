import { useMemo, useState } from 'react'
import Map from 'react-map-gl'
import { ScatterplotLayer } from 'deck.gl'
import { DeckGL } from 'deck.gl'
import { useViewport } from '../../hooks/useViewport'
import { useMapStore } from '../../store/mapStore'

const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL ?? '/styles/osm-style.json'

const INITIAL_VIEW_STATE = {
  longitude: 108.2,
  latitude: 16.0,
  zoom: 6,
  pitch: 0,
  bearing: 0,
}

export function MapView() {
  const { onMove } = useViewport()
  const setSelectedMmsi = useMapStore((state) => state.setSelectedMmsi)
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)

  const layers = useMemo(() => {
    return [
      new ScatterplotLayer({
        id: 'vessel-points',
        data: [
          {
            position: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
            mmsi: 123456789,
            color: [14, 165, 233],
          },
        ],
        getPosition: (d: { position: [number, number] }) => d.position,
        getRadius: 1000,
        radiusMinPixels: 6,
        radiusMaxPixels: 20,
        getFillColor: (d: { color: [number, number, number] }) => d.color,
        pickable: true,
        onClick: (info: { object?: { mmsi?: number } }) => {
          if (info.object?.mmsi) {
            setSelectedMmsi(info.object.mmsi)
          }
        },
      }),
    ]
  }, [setSelectedMmsi])

  return (
    <div className="h-full w-full">
      <Map
        mapStyle={MAP_STYLE_URL}
        initialViewState={viewState}
        onMove={(evt) => {
          setViewState(evt.viewState)
          onMove(evt.viewState)
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <DeckGL
          initialViewState={viewState}
          controller={true}
          layers={layers}
          getCursor={() => 'crosshair'}
        />
      </Map>
    </div>
  )
}
