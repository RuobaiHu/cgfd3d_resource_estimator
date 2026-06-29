import { useState } from 'react';
import MapCanvas from './components/MapCanvas';
import InputPanel from './components/InputPanel';
import ResultsPanel from './components/ResultsPanel';
import { type CalculationReport } from './lib/fdmCalculator';
import './App.css';

function App() {
  const [report, setReport] = useState<CalculationReport | null>(null);
  const [bounds, setBounds] = useState<{ latMin: number; latMax: number; lonMin: number; lonMax: number } | null>(null);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 标题栏 */}
      <header className="bg-blue-800 text-white px-6 py-3 shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">CGFD3D 地震波场正演计算资源估算器</h1>
          <p className="text-xs text-blue-200">地震科学实验场（川滇地区）配套软件</p>
        </div>
        <p className="self-start text-[10px] leading-none text-blue-300/80">Copyright ©️ 2026 胡若白 @ 张伟课题组, 南方科技大学. All rights reserved.</p>
      </header>

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧地图 */}
        <div className="w-2/3 relative border-r border-gray-300">
          <MapCanvas onBoundsChange={setBounds} />
        </div>

        {/* 右侧面板 */}
        <div className="w-1/3 overflow-y-auto p-4 space-y-4">
          <InputPanel onCalculate={setReport} bounds={bounds} />
          <ResultsPanel report={report} />
        </div>
      </div>
    </div>
  );
}

export default App;
