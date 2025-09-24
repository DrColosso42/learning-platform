import { useState, useEffect } from 'react';
import { StatisticsService } from '../services/statisticsService';

interface TimeActivityData {
  date: string;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface TimeGraphProps {
  days?: number;
  height?: number;
  showTitle?: boolean;
}

/**
 * TimeGraph component displays a 2D line/area chart of daily study time
 * Shows study time in minutes over a date range for motivation tracking
 */
export default function TimeGraph({ days = 90, height = 300, showTitle = true }: TimeGraphProps) {
  const [timeData, setTimeData] = useState<TimeActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeData();
  }, [days]);

  const loadTimeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await StatisticsService.getTimeActivityData(days);
      console.log('📊 TimeGraph: Loaded time data:', data.slice(-7)); // Log last 7 days
      setTimeData(data);
    } catch (error) {
      console.error('Failed to load time activity data:', error);
      setError('Failed to load time data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter to show only last N days and remove days with 0 minutes for cleaner visualization
  const displayData = timeData.slice(-days);
  const maxMinutes = Math.max(...displayData.map(d => d.minutes), 60); // At least 60 min scale
  const totalMinutes = displayData.reduce((sum, day) => sum + day.minutes, 0);

  // Format time duration
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Create SVG path for the area chart
  const createAreaPath = (): string => {
    if (displayData.length === 0) return '';

    const width = 100; // Use percentage-based width
    const stepX = width / (displayData.length - 1 || 1);

    const points = displayData.map((day, index) => {
      const x = index * stepX;
      const y = 100 - (day.minutes / maxMinutes) * 100; // Invert Y for SVG coordinates
      return `${x},${y}`;
    }).join(' ');

    // Create area path (filled area under the line)
    const firstPoint = displayData.length > 0 ? `0,100` : '0,100';
    const lastPoint = displayData.length > 0 ? `${(displayData.length - 1) * stepX},100` : '0,100';

    return `M ${firstPoint} L ${points} L ${lastPoint} Z`;
  };

  // Create SVG path for the line
  const createLinePath = (): string => {
    if (displayData.length === 0) return '';

    const width = 100;
    const stepX = width / (displayData.length - 1 || 1);

    const points = displayData.map((day, index) => {
      const x = index * stepX;
      const y = 100 - (day.minutes / maxMinutes) * 100;
      return `${x},${y}`;
    }).join(' ');

    return `M ${points}`;
  };

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
      }}>
        <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
        <button
          onClick={loadTimeData}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: showTitle ? 'auto' : `${height}px`,
    }}>
      {showTitle && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0 0 0.5rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>📈</span>
            Daily Study Time
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0,
          }}>
            Total study time over the last {days} days: {formatTime(totalMinutes)}
          </p>
        </div>
      )}

      {isLoading ? (
        <div style={{
          height: `${height - (showTitle ? 80 : 0)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
        }}>
          Loading time data...
        </div>
      ) : (
        <div style={{ height: `${height - (showTitle ? 80 : 0)}px`, position: 'relative' }}>
          {/* SVG Chart */}
          <svg
            width="100%"
            height="80%"
            viewBox="0 0 100 100"
            style={{
              overflow: 'visible',
            }}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="20" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Y-axis labels */}
            {[0, 25, 50, 75, 100].map((y, index) => (
              <g key={y}>
                <line x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                <text
                  x="-3"
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize="3"
                  fill="#6b7280"
                >
                  {formatTime(Math.round((100 - y) / 100 * maxMinutes))}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path
              d={createAreaPath()}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
            />

            {/* Line */}
            <path
              d={createLinePath()}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {displayData.map((day, index) => {
              if (day.minutes === 0) return null;

              const x = (index / (displayData.length - 1 || 1)) * 100;
              const y = 100 - (day.minutes / maxMinutes) * 100;

              return (
                <circle
                  key={day.date}
                  cx={x}
                  cy={y}
                  r="1"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="0.5"
                >
                  <title>{`${formatDate(day.date)}: ${formatTime(day.minutes)}`}</title>
                </circle>
              );
            })}
          </svg>

          {/* X-axis dates */}
          <div style={{
            height: '20%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}>
            {/* Show dates for first, middle, and last points */}
            <span>{displayData.length > 0 ? formatDate(displayData[0].date) : ''}</span>
            <span>{displayData.length > 1 ? formatDate(displayData[Math.floor(displayData.length / 2)].date) : ''}</span>
            <span>{displayData.length > 0 ? formatDate(displayData[displayData.length - 1].date) : ''}</span>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        fontSize: '0.875rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            {formatTime(Math.round(totalMinutes / Math.max(1, displayData.filter(d => d.minutes > 0).length)))}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Avg per active day</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            {Math.max(...displayData.map(d => d.minutes), 0) > 0 ? formatTime(Math.max(...displayData.map(d => d.minutes))) : '0m'}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Longest session</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            {displayData.filter(d => d.minutes > 0).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Active days</div>
        </div>
      </div>
    </div>
  );
}