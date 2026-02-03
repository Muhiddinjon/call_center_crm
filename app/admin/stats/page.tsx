'use client';

import { OperatorStats } from '@/components/admin/OperatorStats';

export default function StatsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Statistika</h1>
        <p className="text-gray-500">Operator va qo&apos;ng&apos;iroqlar statistikasi</p>
      </div>

      <OperatorStats />
    </div>
  );
}
