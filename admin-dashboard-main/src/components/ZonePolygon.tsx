import { useEffect } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { GeoPoint } from "../utils/geo";

type Props = {
  zone: GeoPoint[];
  /** stroke/fill color — defaults to blue */
  color?: string;
};

/**
 * Renders a filled polygon overlay on the nearest <Map> context.
 * Must be rendered as a child of <Map>.
 * Does nothing when zone has fewer than 3 points.
 */
export const ZonePolygon: React.FC<Props> = ({ zone, color = "#3b82f6" }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !mapsLib || zone.length < 3) return;

    const polygon = new mapsLib.Polygon({
      paths: zone.map((p) => ({ lat: p.lat, lng: p.lng })),
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.12,
    });
    polygon.setMap(map);

    return () => {
      polygon.setMap(null);
    };
  }, [map, mapsLib, zone, color]);

  return null;
};
