import ComparisonTable from './ComparisonTable';
import HistoryLog from './HistoryLog';
import RadarChart from './RadarChart';

/**
 * Render the combined results dashboard.
 * @param {{original: object, modified: object}} props Component props.
 * @returns {JSX.Element} Results viewer.
 */
export default function ResultsViewer({ original, modified }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <RadarChart original={original} modified={modified} />
        <ComparisonTable original={original} modified={modified} />
      </div>
      <HistoryLog />
    </div>
  );
}
