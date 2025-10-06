"use client";
import type NativeMapView from "react-native-maps";
import type { Camera } from "react-native-maps";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import React from "react";

// Internal component that uses the map context
const MapContent = ({
  children,
  mapRef,
}: {
  children?: React.ReactNode;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
}) => {
  const map = useMap();

  React.useEffect(() => {
    if (map) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  return <>{children}</>;
};

export const MapView = React.forwardRef<
  any,
  React.ComponentProps<typeof NativeMapView> & { children?: React.ReactNode }
>(
  (
    {
      style,
      userInterfaceStyle,
      pitchEnabled,
      rotateEnabled,
      scrollEnabled,
      zoomEnabled,
      initialRegion,
      showsBuildings,
      showsCompass,
      showsIndoorLevelPicker,
      showsIndoors,
      showsMyLocationButton,
      showsPointsOfInterest,
      showsScale,
      showsUserLocation,
      showsTraffic,
      children,
    },
    ref
  ) => {
    if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
      throw new Error("Missing process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY");
    }

    const mapRef = React.useRef<google.maps.Map | null>(null);

    const animateCamera = React.useCallback(
      (camera: Partial<Camera>, opts?: { duration?: number }) => {
        console.log("animateCamera", camera);
        if (mapRef.current) {
          if (camera.center) {
            mapRef.current.panTo({
              lat: camera.center.latitude,
              lng: camera.center.longitude,
            });
          }

          if (camera.zoom !== undefined) {
            mapRef.current.setZoom(camera.zoom);
          }

          if (camera.heading !== undefined) {
            mapRef.current.setHeading(camera.heading);
          }

          if (camera.pitch !== undefined) {
            mapRef.current.setTilt(camera.pitch);
          }
        }
      },
      []
    );

    const setCamera = React.useCallback((camera: Camera) => {
      console.log("setCamera", camera);
      if (mapRef.current) {
        mapRef.current.setCenter({
          lat: camera.center.latitude,
          lng: camera.center.longitude,
        });

        if (camera.zoom !== undefined) {
          mapRef.current.setZoom(camera.zoom);
        }

        if (camera.heading !== undefined) {
          mapRef.current.setHeading(camera.heading);
        }

        if (camera.pitch !== undefined) {
          mapRef.current.setTilt(camera.pitch);
        }
      }
    }, []);

    React.useImperativeHandle(
      ref,
      () => ({
        setCamera,
        animateCamera,
      }),
      [animateCamera, setCamera]
    );

    const defaultCenter = initialRegion
      ? {
          lat: initialRegion.latitude,
          lng: initialRegion.longitude,
        }
      : { lat: 0, lng: 0 };

    const defaultZoom = initialRegion
      ? Math.round(Math.log2(360 / initialRegion.longitudeDelta))
      : 10;

    const containerStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
    };

    return (
      <APIProvider apiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}>
        <div style={containerStyle}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
            gestureHandling={scrollEnabled ? "greedy" : "none"}
            disableDefaultUI={!showsCompass}
            zoomControl={zoomEnabled}
            rotateControl={rotateEnabled}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            mapId={process.env.EXPO_PUBLIC_GOOGLE_MAP_ID}
            colorScheme={userInterfaceStyle === "dark" ? "DARK" : "LIGHT"}
          >
            <MapContent mapRef={mapRef}>{children}</MapContent>
          </Map>
        </div>
      </APIProvider>
    );
  }
);

MapView.displayName = "MapView";

export function Marker({
  coordinate,
  focusable,
  isTVSelectable,
  tappable,
}: React.ComponentProps<typeof import("react-native-maps").Marker>) {
  return (
    <AdvancedMarker
      position={{ lat: coordinate.latitude, lng: coordinate.longitude }}
      clickable={tappable}
    />
  );
}

export function UrlTile() {
  return <></>;
}
