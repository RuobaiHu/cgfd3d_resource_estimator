import { useState, useEffect } from 'react';
import { computeAll, geoToKm, autoEstimateTimeWindow, type FDMParams, type CalculationReport } from '../lib/fdmCalculator';
import InfoTooltip from './InfoTooltip';

interface Props {
  onCalculate: (report: CalculationReport) => void;
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number } | null;
}

export default function InputPanel({ onCalculate, bounds }: Props) {
  const [fmax, setFmax] = useState<string>('2');
  const [lz, setLz] = useState<string>('20');
  const [vsMin, setVsMin] = useState<string>('1500');
  const [vpmax, setVpmax] = useState<string>('6000');
  const [cfl, setCfl] = useState<string>('1.3');
  const [twin, setTwin] = useState<string>('');
  const [lx, setLx] = useState<string>('');
  const [ly, setLy] = useState<string>('');
  const [autoTwin, setAutoTwin] = useState<boolean>(true);

  useEffect(() => {
    if (bounds) {
      const { lx: lxKm, ly: lyKm } = geoToKm(bounds.lonMin, bounds.lonMax, bounds.latMin, bounds.latMax);
      setLx(lxKm.toFixed(2));
      setLy(lyKm.toFixed(2));
      if (autoTwin) {
        const tw = autoEstimateTimeWindow(lxKm, lyKm, parseFloat(vsMin) || 1500);
        setTwin(tw.toFixed(2));
      }
    }
  }, [bounds, autoTwin, vsMin]);

  const handleAutoTwinToggle = () => {
    setAutoTwin(!autoTwin);
    if (!autoTwin && lx && ly) {
      const tw = autoEstimateTimeWindow(parseFloat(lx), parseFloat(ly), parseFloat(vsMin) || 1500);
      setTwin(tw.toFixed(2));
    }
  };

  const handleCalculate = () => {
    const lxVal = parseFloat(lx);
    const lyVal = parseFloat(ly);
    const lzVal = parseFloat(lz);
    const fmaxVal = parseFloat(fmax);
    const vsMinVal = parseFloat(vsMin);
    const vpmaxVal = parseFloat(vpmax) || 6000;
    const cflVal = parseFloat(cfl) || 1.3;
    const twinVal = autoTwin ? undefined : (parseFloat(twin) || undefined);

    if (isNaN(lxVal) || isNaN(lyVal) || isNaN(lzVal) || isNaN(fmaxVal) || isNaN(vsMinVal)) {
      alert('请确保 Lx, Ly, Lz, fmax, Vs_min 均为有效数值');
      return;
    }

    const params: FDMParams = {
      lxKm: lxVal,
      lyKm: lyVal,
      lzKm: lzVal,
      fmaxHz: fmaxVal,
      vsMinMs: vsMinVal,
      vpmaxMs: vpmaxVal,
      cfl: cflVal,
      twin: twinVal,
    };

    const report = computeAll(params);
    onCalculate(report);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800 border-b pb-2">参数设置</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Lx (km)</label>
          <input
            type="number"
            value={lx}
            onChange={(e) => setLx(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="地图框选或手动输入"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Ly (km)</label>
          <input
            type="number"
            value={ly}
            onChange={(e) => setLy(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="地图框选或手动输入"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Lz (km)</label>
          <input
            type="number"
            value={lz}
            onChange={(e) => setLz(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">模拟最高频率 (Hz)</label>
          <input
            type="number"
            value={fmax}
            onChange={(e) => setFmax(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">最小S波波速 (m/s)</label>
          <input
            type="number"
            value={vsMin}
            onChange={(e) => setVsMin(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">最大P波波速 (m/s)</label>
          <input
            type="number"
            value={vpmax}
            onChange={(e) => setVpmax(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">CFL条件数</label>
          <select
            value={cfl}
            onChange={(e) => setCfl(e.target.value)}
            className="w-full h-[34px] px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="1.3">1.3 (DRP/opt MacCormack)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">时间窗 (s)</label>
          <input
            type="number"
            value={twin}
            onChange={(e) => setTwin(e.target.value)}
            disabled={autoTwin}
            className="w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="autoTwin"
          checked={autoTwin}
          onChange={handleAutoTwinToggle}
          className="w-4 h-4"
        />
        <label htmlFor="autoTwin" className="text-sm text-gray-600">
          自动估算时间窗
        </label>
        <InfoTooltip text="自动估算的时间窗长度 T = 1.2 × ( 计算区域水平对角线长度的一半 / 最小S波波速 ) " />
      </div>

      <button
        onClick={handleCalculate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
      >
        计算资源估算
      </button>
    </div>
  );
}
