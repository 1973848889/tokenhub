'use client';

import React from 'react';
import { Card, Empty } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function RiskPieChart({ data }: { data: any[] }) {
  if (data.length === 0) return <Empty description="暂无风险数据" />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2} dataKey="value">
          {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v} 次`, '']} />
        <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(v: string) => <span style={{ fontSize: 12 }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
