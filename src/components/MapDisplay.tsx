import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'MY_GOOGLE_MAPS_KEY';

interface MapDisplayProps {
  center: { lat: number; lng: number };
  address: string;
}

export function MapDisplay({ center, address }: MapDisplayProps) {
  if (!hasValidKey) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-2xl flex items-center justify-center text-center p-4 border border-dashed border-gray-300">
        <div className="max-w-xs">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Google Maps API Key Required</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Please add <code>GOOGLE_MAPS_PLATFORM_KEY</code> to your secrets to enable map integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-48 rounded-2xl overflow-hidden border border-black/5 shadow-sm">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={center}
          defaultZoom={15}
          mapId="DEMO_MAP_ID"
          {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
          style={{ width: '100%', height: '100%' }}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
        >
          <AdvancedMarker position={center} title={address}>
            <Pin background="#10b981" glyphColor="#fff" borderColor="#059669" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
