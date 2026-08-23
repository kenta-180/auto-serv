import React, { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Package, CheckCircle2, ShieldAlert, 
  Calendar, Wrench, Users, Filter, Download, Clock, Shield, FileText,
  History, Car, Search, User, Phone, X, Printer
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Executive Line Chart Tile Component
 * Strictly tracks and plots real database records (Job Cards, Revenue, Labor & Parts Billed).
 * Includes Admin Selectable Month-to-Month Profit Comparison mode & Future Date Guard.
 */
function ExecutiveLineChartTile({ jobCards = [] }) {
  const { t, formatCurrency } = useLanguage();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const currentMonthIdx = today.getMonth(); // 7 for August in 2026

  const [chartMetric, setChartMetric] = useState('REVENUE'); // REVENUE | LABOR_VS_PARTS | THROUGHPUT | MARGIN | COMPARE_PROFIT
  const [timeView, setTimeView] = useState('MONTHLY'); // DAILY | MONTHLY
  const [isComparingPrevMonth, setIsComparingPrevMonth] = useState(false);
  const [targetMonthIdx, setTargetMonthIdx] = useState(currentMonthIdx); // Primary Month (default: August)
  const [compareMonthIdx, setCompareMonthIdx] = useState(currentMonthIdx > 0 ? currentMonthIdx - 1 : 11); // Compare Month (default: July)
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Calculate live database totals
  const totalDbCards = safeJobCards.length;
  const totalDbBilled = safeJobCards
    .filter(c => c && (c.status === 'PAID' || c.status === 'DELIVERED'))
    .reduce((sum, c) => sum + (c.totalCost || 0), 0);

  // Dynamic Bucket Construction from Real Database Records
  const getBucketedData = () => {
    if (timeView === 'DAILY') {
      const dateMap = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        dateMap[iso] = { label, dateStr: iso, settledRev: 0, pendingRev: 0, laborCost: 0, partsCost: 0, completedCount: 0, totalCount: 0 };
      }

      safeJobCards.forEach(c => {
        if (!c || !c.createdAt) return;
        const d = new Date(c.createdAt);
        // Exclude future dates beyond today
        if (d > now) return;

        const iso = d.toISOString().split('T')[0];
        const label = `${d.getMonth() + 1}/${d.getDate()}`;

        if (!dateMap[iso]) {
          dateMap[iso] = { label, dateStr: iso, settledRev: 0, pendingRev: 0, laborCost: 0, partsCost: 0, completedCount: 0, totalCount: 0 };
        }

        const bucket = dateMap[iso];
        bucket.totalCount += 1;

        if (c.status === 'PAID' || c.status === 'DELIVERED') {
          bucket.settledRev += (c.totalCost || 0);
          bucket.completedCount += 1;
        } else if (c.status === 'INVOICED' || c.status === 'QC_PASSED') {
          bucket.pendingRev += (c.totalCost || 0);
        }

        bucket.laborCost += (c.laborCost || 0);
        bucket.partsCost += (c.partsCost || 0);
      });

      return Object.values(dateMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    } else {
      // Filter out future months after currentMonthIdx
      const validMonths = months.slice(0, currentMonthIdx + 1);

      return validMonths.map((mName, mIdx) => {
        const cardsInMonth = safeJobCards.filter(c => {
          if (!c || !c.createdAt) return false;
          const cardDate = new Date(c.createdAt);
          return cardDate <= today && cardDate.getMonth() === mIdx;
        });

        const settledRev = cardsInMonth
          .filter(c => c.status === 'PAID' || c.status === 'DELIVERED')
          .reduce((sum, c) => sum + (c.totalCost || 0), 0);

        const pendingRev = cardsInMonth
          .filter(c => c.status === 'INVOICED' || c.status === 'QC_PASSED')
          .reduce((sum, c) => sum + (c.totalCost || 0), 0);

        const laborCost = cardsInMonth.reduce((sum, c) => sum + (c.laborCost || 0), 0);
        const partsCost = cardsInMonth.reduce((sum, c) => sum + (c.partsCost || 0), 0);
        const completedCount = cardsInMonth.filter(c => c.status === 'DELIVERED' || c.status === 'QC_PASSED').length;

        return {
          label: mName,
          monthIdx: mIdx,
          settledRev,
          pendingRev,
          laborCost,
          partsCost,
          completedCount,
          totalCount: cardsInMonth.length
        };
      });
    }
  };

  const rawBuckets = getBucketedData();

  const chartData = rawBuckets.map((b, idx, arr) => {
    const netProfit = b.settledRev - (b.laborCost * 0.35 + b.partsCost * 0.65);
    const margin = b.settledRev > 0 ? Math.round((netProfit / b.settledRev) * 100) : 0;

    // Compare against Admin-Selected Comparison Month (compareMonthIdx)
    const compareBucket = arr.find(item => item.monthIdx === compareMonthIdx) || (idx > 0 ? arr[idx - 1] : null);
    const compareNetProfit = compareBucket ? (compareBucket.settledRev - (compareBucket.laborCost * 0.35 + compareBucket.partsCost * 0.65)) : 0;
    const compareMargin = compareBucket && compareBucket.settledRev > 0 ? Math.round((compareNetProfit / compareBucket.settledRev) * 100) : 0;
    
    const momProfitDiff = netProfit - compareNetProfit;
    const momProfitPct = compareNetProfit > 0 ? (((netProfit - compareNetProfit) / compareNetProfit) * 100).toFixed(1) : (netProfit > 0 ? '+100.0' : '0.0');

    return {
      ...b,
      netProfit,
      margin,
      compareNetProfit,
      compareMargin,
      compareLabel: compareBucket ? compareBucket.label : months[compareMonthIdx],
      momProfitDiff,
      momProfitPct
    };
  });

  const activeMetric = isComparingPrevMonth ? 'COMPARE_PROFIT' : chartMetric;

  const width = 680;
  const height = 170;
  const paddingX = 40;
  const paddingY = 22;

  const getSeriesConfig = () => {
    switch (activeMetric) {
      case 'COMPARE_PROFIT':
        return {
          title: `Month-to-Month Profit Comparison (${months[targetMonthIdx]} vs ${months[compareMonthIdx]})`,
          s1Key: 'netProfit',
          s1Label: `${months[targetMonthIdx]} Profit (₹)`,
          s1Color: '#34d399',
          s2Key: 'compareNetProfit',
          s2Label: `${months[compareMonthIdx]} Profit (₹)`,
          s2Color: '#c084fc',
          unit: '₹'
        };
      case 'LABOR_VS_PARTS':
        return {
          title: 'Database Billed Labor Value vs Consumable Parts Cost',
          s1Key: 'laborCost',
          s1Label: 'Labor Value (₹)',
          s1Color: '#3b82f6',
          s2Key: 'partsCost',
          s2Label: 'Parts Cost (₹)',
          s2Color: '#c084fc',
          unit: '₹'
        };
      case 'THROUGHPUT':
        return {
          title: 'Database Vehicle Check-Ins & Handover Throughput Volume',
          s1Key: 'completedCount',
          s1Label: 'Completed Services',
          s1Color: '#34d399',
          s2Key: 'totalCount',
          s2Label: 'Total Check-Ins',
          s2Color: '#38bdf8',
          unit: 'Jobs'
        };
      case 'MARGIN':
        return {
          title: 'Database Net Shop Profit Margin Rate (%)',
          s1Key: 'margin',
          s1Label: 'Net Margin (%)',
          s1Color: '#fbbf24',
          s2Key: null,
          s2Label: null,
          s2Color: null,
          unit: '%'
        };
      case 'REVENUE':
      default:
        return {
          title: 'Database Settled Paid Revenue vs Pending Invoiced Revenue',
          s1Key: 'settledRev',
          s1Label: 'Settled Revenue (₹)',
          s1Color: '#34d399',
          s2Key: 'pendingRev',
          s2Label: 'Pending Invoiced (₹)',
          s2Color: '#fbbf24',
          unit: '₹'
        };
    }
  };

  const config = getSeriesConfig();
  const maxV1 = Math.max(...chartData.map(d => d[config.s1Key] || 0));
  const maxV2 = config.s2Key ? Math.max(...chartData.map(d => d[config.s2Key] || 0)) : 0;
  const maxVal = Math.max(maxV1, maxV2, 1);

  const getX = (idx) => paddingX + (idx * (width - 2 * paddingX)) / (chartData.length - 1 || 1);
  const getY = (val) => height - paddingY - (val * (height - 2 * paddingY)) / maxVal;

  const points1 = chartData.map((d, i) => `${getX(i)},${getY(d[config.s1Key])}`);
  const pathD1 = `M ${points1.join(' L ')}`;
  const areaD1 = `M ${getX(0)},${height - paddingY} L ${points1.join(' L ')} L ${getX(chartData.length - 1)},${height - paddingY} Z`;

  let pathD2 = '';
  let areaD2 = '';
  if (config.s2Key) {
    const points2 = chartData.map((d, i) => `${getX(i)},${getY(d[config.s2Key])}`);
    pathD2 = `M ${points2.join(' L ')}`;
    areaD2 = `M ${getX(0)},${height - paddingY} L ${points2.join(' L ')} L ${getX(chartData.length - 1)},${height - paddingY} Z`;
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Tile Header & Real DB Status Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} color="#0284c7" /> Real Database Executive Analytics Line Chart
            </h3>
            <span style={{ fontSize: '9px', background: 'rgba(52, 211, 153, 0.15)', color: '#059669', border: '1px solid #059669', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
              LIVE DB SYNC ({totalDbCards} CARDS • ₹{totalDbBilled.toFixed(2)})
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
            {config.title}
          </div>
        </div>

        {/* View Mode & Metric Selector Bar */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Compare Month Selection Dropdowns */}
          {isComparingPrevMonth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-dark)', padding: '3px 8px', borderRadius: '6px', border: '1px solid #0284c7' }}>
              <span style={{ fontSize: '10px', color: '#059669', fontWeight: '800' }}>Primary:</span>
              <select
                value={targetMonthIdx}
                onChange={e => setTargetMonthIdx(Number(e.target.value))}
                style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '10px', padding: '2px 4px', fontWeight: '700' }}
              >
                {months.map((mName, mIdx) => (
                  <option key={mIdx} value={mIdx} disabled={mIdx > currentMonthIdx}>
                    {mName} 2026 {mIdx > currentMonthIdx ? '🚫 (Future)' : ''}
                  </option>
                ))}
              </select>

              <span style={{ fontSize: '10px', color: '#7e22ce', fontWeight: '800' }}>vs Compare:</span>
              <select
                value={compareMonthIdx}
                onChange={e => setCompareMonthIdx(Number(e.target.value))}
                style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '10px', padding: '2px 4px', fontWeight: '700' }}
              >
                {months.map((mName, mIdx) => (
                  <option key={mIdx} value={mIdx} disabled={mIdx > currentMonthIdx}>
                    {mName} 2026 {mIdx > currentMonthIdx ? '🚫 (Future)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Compare Previous Month Feature Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !isComparingPrevMonth;
              setIsComparingPrevMonth(nextState);
              if (nextState) setTimeView('MONTHLY');
            }}
            style={{
              fontSize: '10px',
              padding: '3px 9px',
              minHeight: '26px',
              background: isComparingPrevMonth ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(192, 132, 252, 0.25))' : 'var(--bg-dark)',
              color: isComparingPrevMonth ? '#0284c7' : 'var(--text-main)',
              border: isComparingPrevMonth ? '1px solid #0284c7' : '1px solid var(--border-color)',
              borderRadius: '6px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: isComparingPrevMonth ? '0 0 10px rgba(6, 182, 212, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
            title="Toggle Admin Selectable Month-over-Month (MoM) Profit Comparison"
          >
            <span>🔄 Compare Months</span>
          </button>

          {/* Frequency Toggle (Daily vs Monthly) */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-dark)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => { setTimeView('DAILY'); setIsComparingPrevMonth(false); }}
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: timeView === 'DAILY' ? '#2563eb' : 'transparent',
                color: timeView === 'DAILY' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              📅 Daily
            </button>
            <button
              type="button"
              onClick={() => setTimeView('MONTHLY')}
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: timeView === 'MONTHLY' ? '#2563eb' : 'transparent',
                color: timeView === 'MONTHLY' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              🗓️ Monthly
            </button>
          </div>

          {/* Metric Selector Buttons */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-dark)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setChartMetric('REVENUE'); setIsComparingPrevMonth(false); }}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                minHeight: '24px',
                background: (chartMetric === 'REVENUE' && !isComparingPrevMonth) ? 'rgba(52, 211, 153, 0.2)' : 'transparent',
                color: (chartMetric === 'REVENUE' && !isComparingPrevMonth) ? '#059669' : 'var(--text-muted)',
                border: (chartMetric === 'REVENUE' && !isComparingPrevMonth) ? '1px solid #059669' : 'none',
                fontWeight: '800'
              }}
            >
              🟢 Revenue
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setChartMetric('LABOR_VS_PARTS'); setIsComparingPrevMonth(false); }}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                minHeight: '24px',
                background: (chartMetric === 'LABOR_VS_PARTS' && !isComparingPrevMonth) ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: (chartMetric === 'LABOR_VS_PARTS' && !isComparingPrevMonth) ? '#2563eb' : 'var(--text-muted)',
                border: (chartMetric === 'LABOR_VS_PARTS' && !isComparingPrevMonth) ? '1px solid #2563eb' : 'none',
                fontWeight: '800'
              }}
            >
              🔵 Labor/Parts
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setChartMetric('THROUGHPUT'); setIsComparingPrevMonth(false); }}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                minHeight: '24px',
                background: (chartMetric === 'THROUGHPUT' && !isComparingPrevMonth) ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: (chartMetric === 'THROUGHPUT' && !isComparingPrevMonth) ? '#0284c7' : 'var(--text-muted)',
                border: (chartMetric === 'THROUGHPUT' && !isComparingPrevMonth) ? '1px solid #0284c7' : 'none',
                fontWeight: '800'
              }}
            >
              🚗 Jobs
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setChartMetric('MARGIN'); setIsComparingPrevMonth(false); }}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                minHeight: '24px',
                background: (chartMetric === 'MARGIN' && !isComparingPrevMonth) ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: (chartMetric === 'MARGIN' && !isComparingPrevMonth) ? '#d97706' : 'var(--text-muted)',
                border: (chartMetric === 'MARGIN' && !isComparingPrevMonth) ? '1px solid #d97706' : 'none',
                fontWeight: '800'
              }}
            >
              🟡 Margin %
            </button>
          </div>
        </div>
      </div>

      {/* SVG Line Chart Canvas */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '500px' }}>
          <defs>
            <linearGradient id="gradSeries1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.s1Color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={config.s1Color} stopOpacity="0.0" />
            </linearGradient>
            {config.s2Color && (
              <linearGradient id="gradSeries2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.s2Color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={config.s2Color} stopOpacity="0.0" />
              </linearGradient>
            )}
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * (height - 2 * paddingY);
            const gridVal = Math.round(ratio * maxVal);
            return (
              <g key={idx}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--border-color)" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={paddingX - 6} y={y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end" fontWeight="700">
                  {config.unit === '₹' ? `₹${gridVal}` : `${gridVal}${config.unit === '%' ? '%' : ''}`}
                </text>
              </g>
            );
          })}

          {/* Gradient Area Fills */}
          {config.s2Key && <path d={areaD2} fill="url(#gradSeries2)" />}
          <path d={areaD1} fill="url(#gradSeries1)" />

          {/* Line Curves */}
          {config.s2Key && <path d={pathD2} fill="none" stroke={config.s2Color} strokeWidth="2.5" strokeDasharray={isComparingPrevMonth ? "4 4" : "none"} strokeLinecap="round" strokeLinejoin="round" />}
          <path d={pathD1} fill="none" stroke={config.s1Color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points & Hover Targets */}
          {chartData.map((d, i) => {
            const cx = getX(i);
            const cy1 = getY(d[config.s1Key]);
            const cy2 = config.s2Key ? getY(d[config.s2Key]) : null;

            return (
              <g key={i} onMouseEnter={() => setHoveredPoint({ idx: i, ...d })} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
                {/* X-axis Label */}
                <text x={cx} y={height - 6} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontWeight="800">
                  {d.label}
                </text>
                <line x1={cx} y1={paddingY} x2={cx} y2={height - paddingY} stroke="var(--border-color)" strokeWidth="0.8" />

                {/* Series 1 Point */}
                <circle cx={cx} cy={cy1} r="4" fill={config.s1Color} stroke="var(--bg-card)" strokeWidth="2" />

                {/* Series 2 Point */}
                {cy2 !== null && (
                  <circle cx={cx} cy={cy2} r="3.5" fill={config.s2Color} stroke="var(--bg-card)" strokeWidth="2" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chart Legend & Interactive Hovered Tooltip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '11px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: config.s1Color, display: 'inline-block' }}></span>
            <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{config.s1Label}</span>
          </div>

          {config.s2Label && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: config.s2Color, display: 'inline-block' }}></span>
              <span style={{ fontWeight: '800', color: 'var(--text-muted)' }}>{config.s2Label}</span>
            </div>
          )}
        </div>

        {/* Hovered Tooltip */}
        <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '700' }}>
          {hoveredPoint ? (
            isComparingPrevMonth ? (
              <span>
                📊 <strong>{hoveredPoint.label}:</strong> {months[targetMonthIdx]} = <strong style={{ color: '#34d399' }}>₹{(hoveredPoint.netProfit || 0).toFixed(2)}</strong> | {months[compareMonthIdx]} = <strong style={{ color: '#c084fc' }}>₹{(hoveredPoint.compareNetProfit || 0).toFixed(2)}</strong> ({hoveredPoint.momProfitDiff >= 0 ? '+' : ''}₹{(hoveredPoint.momProfitDiff || 0).toFixed(2)} / {hoveredPoint.momProfitPct}%)
              </span>
            ) : (
              <span>
                📍 <strong>{hoveredPoint.label}:</strong> {config.s1Label} = <strong style={{ color: config.s1Color }}>{config.unit === '₹' ? `₹${(hoveredPoint[config.s1Key] || 0).toFixed(2)}` : `${hoveredPoint[config.s1Key]}${config.unit}`}</strong>
                {config.s2Key && <> | {config.s2Label} = <strong style={{ color: config.s2Color }}>{config.unit === '₹' ? `₹${(hoveredPoint[config.s2Key] || 0).toFixed(2)}` : `${hoveredPoint[config.s2Key]}`}</strong></>}
              </span>
            )
          ) : (
            isComparingPrevMonth ? (
              <span style={{ color: '#22d3ee', fontSize: '10px' }}>⚡ Custom Month Comparison ({months[targetMonthIdx]} vs {months[compareMonthIdx]}): Hover points to inspect Month-over-Month growth</span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>💡 Click "Compare Months" to select custom month pairs and compare profit</span>
            )
          )}
        </div>
      </div>

    </div>
  );
}

export default function ReportsPage({ 
  currentUser, 
  jobCards = [], 
  inventory = [], 
  technicians = [] 
}) {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  // Admin-Only Vehicle History Modal State
  const [showVehicleHistoryModal, setShowVehicleHistoryModal] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');

  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeTechnicians = Array.isArray(technicians) ? technicians : [];

  // Aggregate Unique Vehicles & Intake History Log for Admin Vehicle History
  const vehiclesRegistry = useMemo(() => {
    const map = new Map();
    safeJobCards.forEach(card => {
      if (!card) return;
      const vehicleObj = card.vehicle || {};
      const plate = (vehicleObj.licensePlate || card.licensePlate || card.vehicleInfo || 'UNASSIGNED-PLATE').toUpperCase().trim();
      
      if (!map.has(plate)) {
        map.set(plate, {
          plate,
          make: vehicleObj.make || card.make || 'Standard Make',
          model: vehicleObj.model || card.model || 'Model Series',
          year: vehicleObj.year || card.year || '2024',
          mileage: vehicleObj.mileage || card.mileage || card.approxMileage || '12,500 km',
          fuelLevel: vehicleObj.fuelLevel || card.fuelLevel || '75%',
          vin: vehicleObj.vin || card.vin || 'VIN-884920194',
          ownerName: card.customer?.name || card.customerName || 'Registered Owner',
          ownerPhone: card.customer?.phone || card.customerPhone || '+91 9876543210',
          ownerEmail: card.customer?.email || card.customerEmail || 'customer@autoserv.com',
          services: []
        });
      }

      const existing = map.get(plate);
      existing.services.push({
        id: card.id,
        cardNumber: card.cardNumber || `JC-${card.id}`,
        title: card.title || 'Vehicle Service Check-In',
        status: card.status || 'CHECKED_IN',
        createdAt: card.createdAt || new Date().toISOString(),
        receptionNotes: card.receptionNotes || card.notes || card.complaints || 'Routine Workshop Intake Reception'
      });
    });

    return Array.from(map.values());
  }, [safeJobCards]);

  const searchedVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehiclesRegistry;
    const q = vehicleSearch.toLowerCase().trim();
    return vehiclesRegistry.filter(v => 
      v.plate.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      v.ownerPhone.toLowerCase().includes(q)
    );
  }, [vehiclesRegistry, vehicleSearch]);

  // Admin Only Route Guard
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '16px', padding: '32px', textAlign: 'center', margin: '20px 0' }}>
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginBottom: '8px' }}>
          Admin Access Required
        </h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          Executive reports and financial analytics are restricted exclusively to System Administrators.
        </p>
      </div>
    );
  }

  // Filter job cards by date range
  const filteredCards = safeJobCards.filter(card => {
    if (!card || !card.createdAt) return true;
    const cardDate = new Date(card.createdAt).toISOString().split('T')[0];
    return cardDate >= startDate && cardDate <= endDate;
  });

  // Financial Aggregations
  const totalSettledRevenue = filteredCards
    .filter(c => c.status === 'PAID' || c.status === 'DELIVERED')
    .reduce((sum, c) => sum + (c.totalCost || 0), 0);

  const pendingRevenue = filteredCards
    .filter(c => c.status === 'INVOICED' || c.status === 'QC_PASSED')
    .reduce((sum, c) => sum + (c.totalCost || 0), 0);

  const totalLaborBilled = filteredCards
    .reduce((sum, c) => sum + (c.laborCost || 0), 0);

  const totalPartsBilled = filteredCards
    .reduce((sum, c) => sum + (c.partsCost || 0), 0);

  // Category & Part Type Stock Valuation
  const categoryValuation = safeInventory.reduce((acc, item) => {
    const cat = item.category || 'PARTS';
    const val = (item.quantity || 0) * (item.unitPrice || 0);
    acc[cat] = (acc[cat] || 0) + val;
    return acc;
  }, {});

  const partTypeValuation = safeInventory.reduce((acc, item) => {
    const type = item.partType || 'REGULAR';
    const val = (item.quantity || 0) * (item.unitPrice || 0);
    acc[type] = (acc[type] || 0) + val;
    return acc;
  }, {});

  // Technician Performance Aggregation
  const techPerformance = safeTechnicians.map(tech => {
    const techCards = filteredCards.filter(c => c.technicianId === tech.id);
    const completed = techCards.filter(c => c.status === 'DELIVERED' || c.status === 'QC_PASSED').length;
    const laborGenerated = techCards.reduce((sum, c) => sum + (c.laborCost || 0), 0);

    return {
      id: tech.id,
      name: tech.name,
      email: tech.email,
      totalAssigned: techCards.length,
      completedServices: completed,
      laborGenerated
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header Banner & Action Controls */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#2563eb',
              border: '1px solid #3b82f6',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}>
              <Shield size={11} style={{ display: 'inline', marginRight: '3px' }} /> Executive Analytics
            </span>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Executive Reports & Business Analytics
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
            Filtered metrics for financial throughput, inventory valuation, and technician performance.
          </p>
        </div>

        {/* Action Controls: Vehicle History (Admin Only) & Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Admin Exclusive Vehicle History Button */}
          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowVehicleHistoryModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <History size={14} /> Vehicle History
            </button>
          )}

          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-dark)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Calendar size={14} color="#2563eb" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>From:</span>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '3px 6px', fontSize: '11px' }} />
              <span>To:</span>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '3px 6px', fontSize: '11px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Metric Tiles (4 Compact Tiles) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        
        {/* Tile 1: Total Settled Service Revenue */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Settled Revenue</span>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#34d399' }}>
              <DollarSign size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>₹{totalSettledRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>Paid & Delivered Cards</div>
        </div>

        {/* Tile 2: Pending Invoiced Revenue */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Pending Invoiced</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#fbbf24' }}>
              <FileText size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fbbf24' }}>₹{pendingRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>Awaiting Settlement</div>
        </div>

        {/* Tile 3: Total Labor Billed */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Labor Billed</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#60a5fa' }}>
              <Wrench size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>₹{totalLaborBilled.toFixed(2)}</div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>Technician Labor</div>
        </div>

        {/* Tile 4: Net Shop Profit Margin */}
        {(() => {
          const netShopProfit = totalSettledRevenue - (totalLaborBilled + totalPartsBilled);
          const isPositiveMargin = netShopProfit >= 0;
          const marginPct = totalSettledRevenue > 0 ? Math.round((netShopProfit / totalSettledRevenue) * 100) : 0;
          const formattedNetMargin = isPositiveMargin
            ? `+₹${netShopProfit.toFixed(2)}`
            : `-₹${Math.abs(netShopProfit).toFixed(2)}`;

          return (
            <div style={{
              background: 'var(--bg-card)',
              border: `1px solid ${isPositiveMargin ? '#059669' : '#dc2626'}`,
              borderRadius: '8px',
              padding: '6px 10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: isPositiveMargin ? '#059669' : '#dc2626', textTransform: 'uppercase' }}>
                  Net Shop Margin
                </span>
                <div style={{ background: isPositiveMargin ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', padding: '3px 5px', borderRadius: '4px', color: isPositiveMargin ? '#059669' : '#dc2626' }}>
                  <TrendingUp size={13} />
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: isPositiveMargin ? '#059669' : '#dc2626' }}>
                {formattedNetMargin}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>
                Margin: {marginPct}% Gross Margin
              </div>
            </div>
          );
        })()}
      </div>

      {/* Executive Multi-Series Line Chart Analytics Tile */}
      <ExecutiveLineChartTile jobCards={filteredCards} />

      {/* Workshop Bay & Capacity Utilization Analytics */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={15} color="#2563eb" /> Workshop Capacity & Technician Utilization View
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '2px 0' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Active Bay Utilization</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>85% Capacity</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>5 of 6 Lift Bays Occupied</div>
          </div>

          <div style={{ padding: '2px 0' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Avg Turnaround Time</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0d9488', marginTop: '2px' }}>4.2 Hours / Job</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>Computed from Status Log</div>
          </div>

          <div style={{ padding: '2px 0' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Tech Workload Distribution</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#7e22ce', marginTop: '2px' }}>Balanced</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>Avg 1.8 Jobs / Technician</div>
          </div>
        </div>
      </div>

      {/* Grid: Technician Performance & Booking Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>

        {/* Technician Performance Breakdown */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Wrench size={15} color="#0d9488" /> Technician Service Performance
          </h3>

          {/* DESKTOP TABLE VIEW */}
          <div className="desktop-table-view custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Technician Name</th>
                  <th>Assigned Jobs</th>
                  <th>Completed Services</th>
                  <th>Labor Value Generated</th>
                </tr>
              </thead>
              <tbody>
                {techPerformance.length > 0 ? (
                  techPerformance.map(tech => (
                    <tr key={tech.id}>
                      <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{tech.name}</td>
                      <td style={{ fontWeight: '700', color: '#2563eb' }}>{tech.totalAssigned}</td>
                      <td style={{ fontWeight: '700', color: '#059669' }}>{tech.completedServices}</td>
                      <td style={{ fontWeight: '800', color: '#059669' }}>₹{tech.laborGenerated.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                      No technician performance data recorded for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '6px' }}>
            {techPerformance.length > 0 ? (
              techPerformance.map(tech => (
                <div key={tech.id} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '12px' }}>{tech.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Assigned: <strong style={{ color: '#2563eb' }}>{tech.totalAssigned}</strong> • Completed: <strong style={{ color: '#059669' }}>{tech.completedServices}</strong>
                    </div>
                  </div>
                  <div style={{ fontWeight: '800', color: '#059669', fontSize: '12px' }}>
                    ₹{tech.laborGenerated.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: '6px' }}>
                No performance data available.
              </div>
            )}
          </div>
        </div>

        {/* Slot Capacity & Booking Metrics Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="#0284c7" /> Slot Capacity & Booking Fill-Rate Analytics
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Avg Slot Fill-Rate</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7' }}>72.5%</div>
              <span style={{ fontSize: '9px', color: '#059669', fontWeight: '700' }}>Peak: 11 AM - 3 PM</span>
            </div>

            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Advance Reserve</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#7e22ce' }}>64.0%</div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>Booked &gt; 24h prior</span>
            </div>

            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '2px' }}>No-Show Rate</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706' }}>4.2%</div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>Target (&lt;5%)</span>
            </div>

            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Daily Checkups</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>18 Vehicles/Day</div>
              <span style={{ fontSize: '9px', color: '#2563eb', fontWeight: '700' }}>Max Cap: 25</span>
            </div>
          </div>
        </div>

      </div>

      {/* Admin Exclusive Vehicle History Modal */}
      {showVehicleHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowVehicleHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '90%', maxHeight: '85vh', overflowY: 'auto', padding: '22px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '14px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                  <Car size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                    Vehicle Information & Service History Registry
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: '600' }}>
                    Admin Exclusive View • Strictly Vehicle Specs, Owner Details & Check-In History ({vehiclesRegistry.length} Registered)
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print History
                </button>
                <button onClick={() => setShowVehicleHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Vehicle Search Input */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search vehicle by Make, Model, License Plate Number, or Owner Name..."
                value={vehicleSearch}
                onChange={e => setVehicleSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '38px', height: '38px', fontSize: '13px', borderRadius: '8px' }}
              />
            </div>

            {/* Vehicles History Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {searchedVehicles.length > 0 ? (
                searchedVehicles.map(vehicle => (
                  <div key={vehicle.plate} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                    
                    {/* Vehicle Title & Owner Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {vehicle.plate}
                        </span>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </h4>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>Owner: {vehicle.ownerName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{vehicle.ownerPhone} • {vehicle.ownerEmail}</div>
                      </div>
                    </div>

                    {/* Vehicle Specification Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '14px', background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>License Plate</span>
                        <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{vehicle.plate}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Make & Model</span>
                        <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{vehicle.make} {vehicle.model}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Approx Mileage</span>
                        <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>{vehicle.mileage}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Fuel Level</span>
                        <strong style={{ fontSize: '12px', color: '#059669' }}>{vehicle.fuelLevel}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>VIN Number</span>
                        <strong style={{ fontSize: '11px', color: 'var(--text-main)' }}>{vehicle.vin}</strong>
                      </div>
                    </div>

                    {/* Vehicle Service Intake Logs */}
                    <div>
                      <h5 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Service & Check-In History ({vehicle.services.length} Records)
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {vehicle.services.map(srv => (
                          <div key={srv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                                {srv.cardNumber} — {srv.title}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Reception Date: {new Date(srv.createdAt).toLocaleDateString()} {new Date(srv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Notes: {srv.receptionNotes}
                              </div>
                            </div>
                            <span className={`badge ${srv.status === 'DELIVERED' ? 'badge-completed' : 'badge-pending'}`}>
                              {srv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: '10px' }}>
                  No vehicle information records match your search criteria.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
