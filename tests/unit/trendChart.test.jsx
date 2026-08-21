import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TrendChart from '../../src/components/TrendChart.jsx';

describe('TrendChart', () => {
  it('renders one bar per data point', () => {
    const data = [
      { date: '2026-08-01', value: 5 },
      { date: '2026-08-02', value: 10 },
      { date: '2026-08-03', value: 0 },
    ];
    const { container } = render(<TrendChart data={data} />);
    expect(container.querySelectorAll('rect')).toHaveLength(3);
  });

  it('does not crash when every value is zero', () => {
    const data = [
      { date: '2026-08-01', value: 0 },
      { date: '2026-08-02', value: 0 },
    ];
    const { container } = render(<TrendChart data={data} />);
    expect(container.querySelectorAll('rect')).toHaveLength(2);
  });

  it('renders nothing for empty data rather than an empty chart', () => {
    const { container } = render(<TrendChart data={[]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
