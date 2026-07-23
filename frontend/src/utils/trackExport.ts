import type { PositionReport } from '../types'

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatIso(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  return d.toISOString()
}

export function buildKml(
  points: PositionReport[],
  mmsi: number,
  startTs: string,
  endTs: string,
): string {
  if (points.length === 0) return ''
  const coords = points
    .map((p) => `${p.lon},${p.lat},${p.heading ?? 0}`)
    .join(' ')

  const placemarks = points
    .map(
      (p, i) => `
    <Placemark>
      <name>Point ${i + 1}</name>
      <TimeStamp><when>${formatIso(p.ts)}</when></TimeStamp>
      <Point><coordinates>${p.lon},${p.lat},0</coordinates></Point>
      <ExtendedData>
        <Data name="sog"><value>${p.sog ?? 0}</value></Data>
        <Data name="cog"><value>${p.cog ?? 0}</value></Data>
        <Data name="heading"><value>${p.heading ?? 0}</value></Data>
      </ExtendedData>
    </Placemark>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>MMSI ${mmsi} Track</name>
    <description>Track from ${formatIso(startTs)} to ${formatIso(endTs)}</description>
    <Style id="trackStyle">
      <LineStyle><color>ff00aaff</color><width>3</width></LineStyle>
    </Style>
    <Placemark>
      <name>MMSI ${mmsi} Track Line</name>
      <styleUrl>#trackStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
    <Folder>
      <name>Track Points</name>
      ${placemarks}
    </Folder>
  </Document>
</kml>`
}

export function buildGpx(
  points: PositionReport[],
  mmsi: number,
  startTs: string,
  endTs: string,
): string {
  if (points.length === 0) return ''
  const trkpts = points
    .map(
      (p) => `
      <trkpt lat="${p.lat}" lon="${p.lon}">
        <time>${formatIso(p.ts)}</time>
        <course>${p.cog ?? 0}</course>
        <heading>${p.heading ?? 0}</heading>
        <speed>${p.sog ?? 0}</speed>
      </trkpt>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MarineAnalytics"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
  <metadata>
    <name>MMSI ${mmsi} Track</name>
    <time>${formatIso(startTs)}</time>
  </metadata>
  <trk>
    <name>MMSI ${mmsi}</name>
    <desc>Track from ${formatIso(startTs)} to ${formatIso(endTs)}</desc>
    <trkseg>${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadKml(
  points: PositionReport[],
  mmsi: number,
  startTs: string,
  endTs: string,
) {
  const kml = buildKml(points, mmsi, startTs, endTs)
  triggerDownload(kml, `track_${mmsi}.kml`, 'application/vnd.google-earth.kml+xml')
}

export function downloadGpx(
  points: PositionReport[],
  mmsi: number,
  startTs: string,
  endTs: string,
) {
  const gpx = buildGpx(points, mmsi, startTs, endTs)
  triggerDownload(gpx, `track_${mmsi}.gpx`, 'application/gpx+xml')
}

export { escapeXml }
