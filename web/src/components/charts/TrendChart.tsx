'use client';
import React from 'react';
import { Card, Segmented, Spin } from 'antd';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Legend } from 'recharts';
import { formatTokens } from '@/lib/formatters';

export default function TrendChart({ data, metric, onMetricChange }: { data: any[]; metric: string; onMetricChange: (v: 'cost'|'tokens') => void }) {
  return (
    <Card title="消耗趋势" extra={<Segmented size="small" value={metric} onChange={(v) => onMetricChange(v as 'cost'|'tokens')} options={[{label:'费用',value:'cost'},{label:'Token',value:'tokens'}]} />}>
      <ResponsiveContainer width="100%" height={280}>
        {metric === 'cost' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{fontSize:11}} />
            <YAxis tick={{fontSize:11}} tickFormatter={(v:number)=>`¥${v}`} width={60} />
            <Tooltip formatter={(v:number)=>[`¥${v.toFixed(2)}`,'费用']} />
            <Area type="monotone" dataKey="cost" stroke="#1677ff" fill="#1677ff20" strokeWidth={2} />
          </AreaChart>
        ) : (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{fontSize:11}} />
            <YAxis tick={{fontSize:11}} tickFormatter={(v:number)=>formatTokens(v)} width={70} />
            <Tooltip formatter={(v:number)=>[formatTokens(v),'']} />
            <Area type="monotone" dataKey="input_tokens" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} name="输入" />
            <Area type="monotone" dataKey="output_tokens" stroke="#10b981" fill="#10b98120" strokeWidth={2} name="输出" />
            <Legend />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}
