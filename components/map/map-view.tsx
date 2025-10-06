"use client";
import type NativeMapView from "react-native-maps";
import type { Camera } from "react-native-maps";

import {
  Marker as AppleMarker,
  ColorScheme,
  FeatureVisibility,
  Map,
} from "mapkit-react";
import React from "react";

export const MapView = ({
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
  ref,
}: React.ComponentProps<typeof NativeMapView>) => {
  if (!process.env.EXPO_PUBLIC_APPLE_MAPKIT_JS_KEY) {
    throw new Error("Missing process.env.EXPO_PUBLIC_APPLE_MAPKIT_JS_KEY");
  }

  const mapRef = React.useRef<mapkit.Map>(null);

  // const animateCamera: (camera: Partial<Camera>, opts?: {
  //     duration?: number;
  // }): void;
  const animateCamera = React.useCallback(
    (camera: Partial<Camera>, opts?: { duration?: number }) => {
      console.log("animateCamera", camera);
      if (mapRef.current) {
        if (camera.zoom) {
          mapRef.current.setCameraZoomRangeAnimated(
            new mapkit.CameraZoomRange(camera.zoom),
            true
          );
        }
        if (camera.altitude) {
          mapRef.current.setCameraDistanceAnimated(camera.altitude, true);
        }
        if (camera.center) {
          mapRef.current.setCameraBoundaryAnimated(
            new mapkit.CoordinateRegion(
              new mapkit.Coordinate(
                camera.center.latitude,
                camera.center.longitude
              ),
              mapRef.current.region.span
            ),
            true
          );
        }
      }
    },
    [mapRef]
  );

  const setCamera = React.useCallback(
    (camera: Camera) => {
      console.log("setCamera", camera);
      if (mapRef.current) {
        if (camera.zoom) {
          mapRef.current.setCameraZoomRangeAnimated(
            new mapkit.CameraZoomRange(camera.zoom),
            false
          );
        }

        if (camera.altitude) {
          mapRef.current.setCameraDistanceAnimated(camera.altitude, false);
        }

        mapRef.current.setCameraBoundaryAnimated(
          new mapkit.CoordinateRegion(
            new mapkit.Coordinate(
              camera.center.latitude,
              camera.center.longitude
            ),
            mapRef.current.region.span
          ),

          false
        );
        // mapRef.current.setRegionAnimated
        // mapRef.current.setCameraBoundary(camera);
      }
    },
    [mapRef]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      setCamera,
      animateCamera,
    }),
    [animateCamera, setCamera]
  );

  return (
    <Map
      ref={mapRef}
      token={process.env.EXPO_PUBLIC_APPLE_MAPKIT_JS_KEY}
      initialRegion={
        !initialRegion
          ? undefined
          : {
              centerLatitude: initialRegion.latitude,
              centerLongitude: initialRegion.longitude,
              latitudeDelta: initialRegion.latitudeDelta,
              longitudeDelta: initialRegion.longitudeDelta,
            }
      }
      isZoomEnabled={zoomEnabled}
      isScrollEnabled={scrollEnabled}
      showsCompass={
        showsCompass ? FeatureVisibility.Visible : FeatureVisibility.Hidden
      }
      showsPointsOfInterest={showsPointsOfInterest}
      showsScale={
        showsScale ? FeatureVisibility.Visible : FeatureVisibility.Hidden
      }
      showsUserLocation={showsUserLocation}
      colorScheme={
        userInterfaceStyle === "dark" ? ColorScheme.Dark : ColorScheme.Light
      }
      isRotationEnabled={rotateEnabled}
    >
      <AppleMarker latitude={46.52} longitude={6.57} />
    </Map>
  );
};

MapView.displayName = "MapView";

export function Marker({
  coordinate,
  focusable,
  isTVSelectable,
  tappable,
}: React.ComponentProps<typeof import("react-native-maps").Marker>) {
  return (
    <AppleMarker
      latitude={coordinate.latitude}
      longitude={coordinate.longitude}
      enabled={tappable}
    />
  );
}

export function UrlTile() {
  return <></>;
}
