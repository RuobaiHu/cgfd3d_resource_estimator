// =========================================================
// 川滇地区 FDM 地震波模拟资源估算器 — 计算核心
// 从 Python fdm_resource_estimator.py 迁移
// =========================================================

export interface FDMParams {
  lxKm: number;
  lyKm: number;
  lzKm: number;
  fmaxHz: number;
  vsMinMs?: number;   // 默认 1500
  vpmaxMs?: number;   // 默认 6000
  cfl?: number;       // 默认 1.3
  twin?: number;      // 默认自动估算
}

export interface FDMResult {
  ppw: number;
  label: string;
  dx: number;
  nx: number;
  ny: number;
  nz: number;
  nTotal: number;
  memTheoryGB: number;
  nCores: number;
  memSafeGB: number;
  lambdaMin: number;
  dtRaw: number;
  dtEff: number;
  ntTotal: number;
  nTotalTimeSteps: number;
  dtConservative: number;
  ntConservative: number;
  nTotalTimeStepsConservative: number;
  timeEstimateSeconds: number;
}

export interface CalculationReport {
  lx: number;
  ly: number;
  lz: number;
  fmax: number;
  vsMin: number;
  vpmax: number;
  cfl: number;
  twin: number;
  autoTwin: boolean;
  precise: FDMResult;
  acceptable: FDMResult;
}

// === 经验常数 =========================================================
const DEFAULT_VS_MIN = 1500.0;
const DEFAULT_CGFD3D_CFL = 1.3;
const PPW_PRECISE = 8;
const PPW_ACCEPTABLE = 6;
const CART_SCALE_FACTOR = 1.0 / Math.sqrt(3.0);
const REF_GRID_POINTS = 4_500_000;
const REF_MEMORY_GB = 1.42;
const OPTIMAL_GRID_PER_CORE = 4_500_000;
const MEM_GB_PER_GRID = REF_MEMORY_GB / REF_GRID_POINTS;
const REF_TIME_STEPS = 1000;
const REF_TIME_SECONDS = 1500.0;
const TIME_SEC_PER_POINT_STEP = REF_TIME_SECONDS / (REF_GRID_POINTS * REF_TIME_STEPS);
const CURV_GRID_FACTOR = 0.6;
const Z_REFINEMENT_FACTOR = 1.4;
const TIME_WINDOW_SCALE = 1.2;
const KM_TO_M = 1000.0;
const SEC_TO_HOUR = 3600.0;
const SEC_TO_DAY = 86400.0;

// === keep_two_digi: 模拟 CGFD3D 的 blk_keep_two_digi() =================
function keepTwoDigi(dt: number): number {
  if (dt === 0) return 0.0;
  const sign = dt > 0 ? 1 : -1;
  const absDt = Math.abs(dt);
  const exponent = Math.floor(Math.log10(absDt));
  const mantissa = absDt / Math.pow(10, exponent);
  const mantissaRounded = Math.round(mantissa * 10) / 10;
  const result = sign * mantissaRounded * Math.pow(10, exponent);
  return exponent < -2 ? parseFloat(result.toExponential(1)) : result;
}

function ceil(v: number): number {
  return Math.ceil(v);
}

// === 计算时间窗自动估算 =================================================
export function autoEstimateTimeWindow(lxKm: number, lyKm: number, vsMin = DEFAULT_VS_MIN): number {
  return 0.5 * Math.sqrt(lxKm * lxKm + lyKm * lyKm) * KM_TO_M / vsMin * TIME_WINDOW_SCALE;
}

// === 经纬度 → km ======================================================
export function geoToKm(lonMin: number, lonMax: number, latMin: number, latMax: number): { lx: number; ly: number } {
  const latCenter = (latMin + latMax) / 2;
  const ly = (latMax - latMin) * 111.0;
  const lx = (lonMax - lonMin) * 111.0 * Math.cos((latCenter * Math.PI) / 180.0);
  return { lx, ly };
}

// === 单方案计算 ======================================================
function computeSingle(
  lxKm: number, lyKm: number, lzKm: number, fmaxHz: number, ppw: number, vsMin: number, vpmax: number, cfl: number, timeWindow: number, label: string
): FDMResult {
  const lambdaMin = vsMin / fmaxHz;
  const dx = lambdaMin / ppw;
  const nx = ceil(lxKm * KM_TO_M / dx);
  const ny = ceil(lyKm * KM_TO_M / dx);
  const nzBase = ceil(lzKm * KM_TO_M / dx);
  const nz = ceil(nzBase * Z_REFINEMENT_FACTOR);
  const nTotal = nx * ny * nz;
  const memTheoryGB = nTotal * MEM_GB_PER_GRID;
  const nCores = ceil(nTotal / OPTIMAL_GRID_PER_CORE);
  const memSafeGB = nCores * REF_MEMORY_GB;

  const dtRaw = cfl * dx / (vpmax * CART_SCALE_FACTOR);
  const dtEff = keepTwoDigi(dtRaw);
  const ntTotal = Math.floor(timeWindow / dtEff + 0.5);
  const nTotalTimeSteps = nTotal * ntTotal;

  const dtConservative = dtEff * CURV_GRID_FACTOR;
  const ntConservative = Math.floor(timeWindow / dtConservative + 0.5);
  const nTotalTimeStepsConservative = nTotal * ntConservative;
  const timeEstimateSeconds = nTotalTimeStepsConservative * TIME_SEC_PER_POINT_STEP / nCores;

  return {
    ppw, label, dx, nx, ny, nz, nTotal,
    memTheoryGB, nCores, memSafeGB, lambdaMin,
    dtRaw, dtEff, ntTotal, nTotalTimeSteps,
    dtConservative, ntConservative, nTotalTimeStepsConservative,
    timeEstimateSeconds,
  };
}

// === 完整计算 ==========================================================
export function computeAll(params: FDMParams): CalculationReport {
  const vsMin = params.vsMinMs ?? DEFAULT_VS_MIN;
  const vpmax = params.vpmaxMs ?? 6000.0;
  const cfl = params.cfl ?? DEFAULT_CGFD3D_CFL;
  let twin: number;
  let autoTwin = false;
  if (params.twin !== undefined && params.twin > 0) {
    twin = params.twin;
  } else {
    twin = autoEstimateTimeWindow(params.lxKm, params.lyKm, vsMin);
    autoTwin = true;
  }

  return {
    lx: params.lxKm,
    ly: params.lyKm,
    lz: params.lzKm,
    fmax: params.fmaxHz,
    vsMin,
    vpmax,
    cfl,
    twin,
    autoTwin,
    precise: computeSingle(params.lxKm, params.lyKm, params.lzKm, params.fmaxHz, PPW_PRECISE, vsMin, vpmax, cfl, twin, '保证结果无数值频散'),
    acceptable: computeSingle(params.lxKm, params.lyKm, params.lzKm, params.fmaxHz, PPW_ACCEPTABLE, vsMin, vpmax, cfl, twin, '可接受的轻微数值频散'),
  };
}

// === 格式化 ============================================================
export function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function fmtFloat(val: number, decimals = 2): string {
  const s = val.toFixed(decimals);
  return s.replace(/\.?0+$/, '');
}

export function fmtScientific(val: number, decimals = 3): string {
  return val.toExponential(decimals);
}

export function fmtMemory(gb: number): string {
  if (gb > 1000) {
    return `${(gb / 1000).toFixed(2)} TB`;
  }
  return `${fmtFloat(gb)} GB`;
}

export function fmtTime(seconds: number): string {
  if (seconds < 60) return `${fmtFloat(seconds, 1)} s`;
  if (seconds < SEC_TO_HOUR) return `${fmtFloat(seconds / 60, 1)} min`;
  if (seconds < SEC_TO_DAY) return `${fmtFloat(seconds / SEC_TO_HOUR, 2)} h`;
  return `${fmtFloat(seconds / SEC_TO_DAY, 2)} 天`;
}
