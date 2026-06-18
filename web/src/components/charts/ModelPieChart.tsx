'use client';
import React from 'react';
import { Card } from 'antd';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

export default function ModelPieChart({ data }: { data: any[] }) {
  return (
    <Card title="模型费用分布">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="cost" nameKey="model_name">
            {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v:number)=>[`¥${v.toFixed(2)}`,'']} />
          <Legend formatter={(v:string)=> <span style={{fontSize:11}}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
