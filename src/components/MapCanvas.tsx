import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

declare const __TIANDITU_PROXY_AVAILABLE__: boolean;

const TIANDITU_BROWSER_KEY =
  import.meta.env.VITE_TIANDITU_BROWSER_KEY?.trim() || import.meta.env.VITE_TIANDITU_KEY?.trim();
const USE_TIANDITU_PROXY = __TIANDITU_PROXY_AVAILABLE__ && import.meta.env.VITE_TIANDITU_USE_PROXY !== 'false';
const TIANDITU_SUBDOMAINS = '01234567';
const FALLBACK_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}';

const createTiandituTileUrl = (layer: 'vec' | 'cva') => {
  const query = `SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;

  if (USE_TIANDITU_PROXY) {
    return `/api/tianditu/t{s}/${layer}_w/wmts?${query}`;
  }

  return `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?${query}&tk=${TIANDITU_BROWSER_KEY}`;
};

interface Bounds {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

interface MapCanvasProps {
  onBoundsChange: (bounds: Bounds | null) => void;
}

// 川滇地震科学实验场大致范围（来自百度百科等公开资料）
const EXPERIMENTAL_FIELD_BOUNDS = L.latLngBounds(
  [21.0, 98.0],   // 西南角
  [34.0, 106.0]   // 东北角
);
const EXPERIMENTAL_FIELD_LAT_SPAN =
  EXPERIMENTAL_FIELD_BOUNDS.getNorth() - EXPERIMENTAL_FIELD_BOUNDS.getSouth();
const EXPERIMENTAL_FIELD_LNG_SPAN =
  EXPERIMENTAL_FIELD_BOUNDS.getEast() - EXPERIMENTAL_FIELD_BOUNDS.getWest();

const EXPERIMENTAL_FIELD_LABEL_POSITION = L.latLng(
  EXPERIMENTAL_FIELD_BOUNDS.getNorth() - EXPERIMENTAL_FIELD_LAT_SPAN * 0.015,
  EXPERIMENTAL_FIELD_BOUNDS.getWest() + EXPERIMENTAL_FIELD_LNG_SPAN * 0.03
);

type Mode = 'draw' | 'pan';

const isLeafletControlEvent = (event: L.LeafletMouseEvent) => {
  const target = event.originalEvent.target;
  return target instanceof HTMLElement && Boolean(target.closest('.leaflet-control'));
};

// SVG 图标：框选模式（一个圆圈里一个点）
const ICON_DRAW = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>`;

// SVG 图标：平移模式（四个方向箭头）
const ICON_PAN = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1 L10 4 L6 4 Z" fill="currentColor"/><path d="M8 15 L10 12 L6 12 Z" fill="currentColor"/><path d="M1 8 L4 6 L4 10 Z" fill="currentColor"/><path d="M15 8 L12 6 L12 10 Z" fill="currentColor"/></svg>`;

export default function MapCanvas({ onBoundsChange }: MapCanvasProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rectLayerRef = useRef<L.Rectangle | null>(null);
  const startRef = useRef<L.LatLng | null>(null);
  const modeRef = useRef<Mode>('draw');
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [status, setStatus] = useState<string>('在地图上拖拽鼠标画一个矩形来框选模拟区域');

  // 同步 ref 与 state（供事件处理函数读取最新值）
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const updateBtnIcon = useCallback((m: Mode) => {
    if (btnRef.current) {
      btnRef.current.innerHTML = m === 'draw' ? ICON_DRAW : ICON_PAN;
      btnRef.current.title = m === 'draw' ? '框选模式：点击切换为平移模式' : '平移模式：点击切换为框选模式';
    }
  }, []);

  const switchMode = useCallback((newMode: Mode) => {
    const map = mapRef.current;
    if (!map) return;
    setMode(newMode);
    updateBtnIcon(newMode);
    if (newMode === 'pan') {
      map.dragging.enable();
      setStatus('平移模式：拖拽地图移动。点击按钮切换回框选模式');
    } else {
      map.dragging.disable();
      setStatus('框选模式：拖拽鼠标画一个矩形来框选模拟区域');
    }
  }, [updateBtnIcon]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.0, 102.0],
      zoom: 6,
    });
    mapRef.current = map;

    // ===== 底图选择 =====
    // 天地图 key 需要开通矢量地图(vec_w)和矢量注记(cva_w)服务权限。
    L.tileLayer(FALLBACK_TILE_URL, {
      attribution: '&copy; Esri',
      maxZoom: 18,
    }).addTo(map);

    if (USE_TIANDITU_PROXY || TIANDITU_BROWSER_KEY) {
      L.tileLayer(createTiandituTileUrl('vec'), {
        attribution: '&copy; 天地图',
        maxZoom: 18,
        subdomains: TIANDITU_SUBDOMAINS,
      }).addTo(map);

      L.tileLayer(createTiandituTileUrl('cva'), {
        attribution: '',
        maxZoom: 18,
        subdomains: TIANDITU_SUBDOMAINS,
      }).addTo(map);
    } else {
      setStatus('未配置天地图 key，已使用备用底图；可拖拽框选区域');
    }

    // 地震实验场范围：蓝色框，无填充
    L.rectangle(EXPERIMENTAL_FIELD_BOUNDS, {
      color: '#2563eb',     // blue-600
      weight: 2,
      fillOpacity: 0,
      dashArray: '8, 6',
    }).addTo(map);
    L.marker(EXPERIMENTAL_FIELD_LABEL_POSITION, {
      interactive: false,
      icon: L.divIcon({
        className: 'experimental-field-label',
        html: '实验场区域',
        iconSize: [72, 18],
        iconAnchor: [0, 0],
      }),
    }).addTo(map);

    // 自定义 Control：平移/框选切换按钮
    const ToggleControl = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.style.cssText = `
          width: 34px;
          height: 34px;
          background: #fff;
          border: 2px solid rgba(0,0,0,0.2);
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          color: #333;
        `;
        btnRef.current = btn;
        btn.innerHTML = ICON_DRAW;
        btn.title = '框选模式：点击切换为平移模式';

        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.disableScrollPropagation(btn);
        ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach((eventName) => {
          L.DomEvent.on(btn, eventName, L.DomEvent.stopPropagation);
        });

        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          const nextMode = modeRef.current === 'draw' ? 'pan' : 'draw';
          switchMode(nextMode);
        });

        return btn;
      },
    });

    const toggleControl = new ToggleControl({ position: 'topleft' });
    toggleControl.addTo(map);

    // 鼠标拖拽框选矩形
    let tempRect: L.Rectangle | null = null;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (modeRef.current !== 'draw' || isLeafletControlEvent(e)) return;
      startRef.current = e.latlng;
      if (tempRect) {
        map.removeLayer(tempRect);
      }
      if (rectLayerRef.current) {
        map.removeLayer(rectLayerRef.current);
        rectLayerRef.current = null;
      }
      tempRect = L.rectangle(
        L.latLngBounds(e.latlng, e.latlng),
        {
          color: '#ef4444',
          weight: 2,
          fillOpacity: 0.15,
        }
      ).addTo(map);
      setStatus('拖拽中... 释放鼠标完成框选');
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (modeRef.current !== 'draw' || !startRef.current || !tempRect) return;
      const bounds = L.latLngBounds(startRef.current, e.latlng);
      tempRect.setBounds(bounds);
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (modeRef.current !== 'draw' || !startRef.current || !tempRect) return;
      const bounds = L.latLngBounds(startRef.current, e.latlng);
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      rectLayerRef.current = tempRect;
      tempRect.setStyle({ color: '#dc2626', weight: 2, fillOpacity: 0.2 });
      startRef.current = null;
      tempRect = null;
      setStatus(`已框选: ${sw.lng.toFixed(2)}°E ~ ${ne.lng.toFixed(2)}°E, ${sw.lat.toFixed(2)}°N ~ ${ne.lat.toFixed(2)}°N`);
      onBoundsChange({
        latMin: sw.lat,
        latMax: ne.lat,
        lonMin: sw.lng,
        lonMax: ne.lng,
      });
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    // 初始禁用拖拽（框选模式）
    map.dragging.disable();

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.remove();
      mapRef.current = null;
    };
  }, [onBoundsChange, switchMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1.5 rounded shadow text-sm text-gray-700 z-[1000]">
        {status}
        <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold" style={{
          backgroundColor: mode === 'draw' ? '#fee2e2' : '#dbeafe',
          color: mode === 'draw' ? '#dc2626' : '#2563eb',
        }}>
          {mode === 'draw' ? '框选模式' : '平移模式'}
        </span>
      </div>
    </div>
  );
}
