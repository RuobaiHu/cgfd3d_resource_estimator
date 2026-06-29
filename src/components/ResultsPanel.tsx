import { type CalculationReport, type FDMResult, fmtNumber, fmtFloat, fmtMemory, fmtScientific, fmtTime } from '../lib/fdmCalculator';
import InfoTooltip from './InfoTooltip';

interface Props {
  report: CalculationReport | null;
}

function ResultCard({ result }: { result: FDMResult }) {
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="font-semibold text-blue-700 border-b border-blue-200 pb-1">
        <span className="inline-flex items-center gap-1.5">
          ppw = {result.ppw}
          <InfoTooltip text={result.label} />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-sm">
        <div className="text-gray-500">最小波长</div>
        <div className="text-right">{fmtFloat(result.lambdaMin)} m</div>
        <div className="text-gray-500">空间步长</div>
        <div className="text-right">{fmtFloat(result.dx)} m</div>
        <div className="text-gray-500">Nx</div>
        <div className="text-right">{fmtNumber(result.nx)}</div>
        <div className="text-gray-500">Ny</div>
        <div className="text-right">{fmtNumber(result.ny)}</div>
        <div className="text-gray-500">Nz</div>
        <div className="text-right">{fmtNumber(result.nz)}</div>
        <div className="text-gray-500">总格点数</div>
        <div className="text-right font-semibold">{fmtScientific(result.nTotal)}</div>
        <div className="text-gray-500">理论内存</div>
        <div className="text-right font-semibold">{fmtMemory(result.memTheoryGB)}</div>
        <div className="text-gray-500">推荐核数</div>
        <div className="text-right font-semibold">{fmtNumber(result.nCores)} 核</div>
        <div className="text-gray-500">推荐内存</div>
        <div className="text-right">{fmtMemory(result.memSafeGB)}</div>
      </div>
      <div className="border-t pt-2 mt-2 space-y-1">
        <div className="text-xs font-semibold text-gray-600">
          <span className="inline-flex items-center gap-1">
            CGFD3D 自动 dt
            <InfoTooltip text="笛卡尔网格" tone="gray" size="small" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-500">理论最大 dt</div>
          <div className="text-right">{fmtFloat(result.dtRaw, 6)} s</div>
          <div className="text-gray-500">实用有效 dt</div>
          <div className="text-right">{fmtFloat(result.dtEff, 6)} s</div>
          <div className="text-gray-500">总步数</div>
          <div className="text-right">{fmtNumber(result.ntTotal)} 步</div>
        </div>
      </div>
      <div className="border-t pt-2 mt-2 space-y-1">
        <div className="text-xs font-semibold text-red-600">
          <span className="inline-flex items-center gap-1">
            保守估算
            <InfoTooltip text="曲线网格需更小 dt" tone="red" size="small" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-gray-500">保守 dt</div>
          <div className="text-right">{fmtFloat(result.dtConservative, 6)} s</div>
          <div className="text-gray-500">保守步数</div>
          <div className="text-right">{fmtNumber(result.ntConservative)} 步</div>
          <div className="text-gray-500 font-semibold text-red-700">预期总计算用时</div>
          <div className="text-right font-bold text-red-700">{fmtTime(result.timeEstimateSeconds)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({ report }: Props) {
  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-gray-400 text-center">
        请在地图上框选区域并点击「计算资源估算」查看结果
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800 border-b pb-2">计算结果</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="text-gray-500">Lx</div>
        <div className="text-right">{fmtFloat(report.lx)} km</div>
        <div className="text-gray-500">Ly</div>
        <div className="text-right">{fmtFloat(report.ly)} km</div>
        <div className="text-gray-500">Lz</div>
        <div className="text-right">{fmtFloat(report.lz)} km</div>
        <div className="text-gray-500">模拟最高频率</div>
        <div className="text-right">{fmtFloat(report.fmax)} Hz</div>
        <div className="text-gray-500">最小S波波速</div>
        <div className="text-right">{fmtFloat(report.vsMin ?? 1500)} m/s</div>
        <div className="text-gray-500">最大P波波速</div>
        <div className="text-right">{fmtFloat(report.vpmax)} m/s</div>
        <div className="text-gray-500">CFL条件数</div>
        <div className="text-right">{fmtFloat(report.cfl ?? 1.3)} (DRP/opt MacCormack)</div>
        <div className="text-gray-500">时间窗</div>
        <div className="text-right">
          {fmtFloat(report.twin)} s
          {report.autoTwin && <span className="text-blue-600 ml-1">(自动)</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultCard result={report.precise} />
        <ResultCard result={report.acceptable} />
      </div>

      <div className="text-xs text-gray-400 text-left pt-2">
        预期总计算用时评估基准：单核 4,500,000 点 × 1000 步 = 2,500 s，其中单核分配 4,500,000 个网格点时需使用约 3 GB 内存。该基准由 2025 年 11 月于华为云 kC2 实例（CPU 型号为 HUAWEI Kunpeng 920）运行的基准测试得到。总用时包含并行效率因子。需计算平台支持 100 Gbps 及以上的节点间带宽。受计算平台硬件架构和网络拓扑结构的影响，实际运行时间可能更长。本估算不构成性能保证，亦不作为验收指标。
      </div>
    </div>
  );
}
