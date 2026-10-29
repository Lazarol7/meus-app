import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MatchStats, Match } from '../types';
import { LANGUAGES, Language } from '../constants';
import { format, startOfMonth } from 'date-fns';

interface StatsChartProps {
  stats: MatchStats[];
  matches: Match[];
  lang: Language;
}

export function StatsChart({ stats, matches, lang }: StatsChartProps) {
  const t = LANGUAGES[lang];

  // Group stats by month
  const monthlyData = stats.reduce((acc, s) => {
    const match = matches.find(m => m.id === s.matchId);
    if (!match) return acc;
    
    const monthKey = format(startOfMonth(match.date), 'MMM yy');
    if (!acc[monthKey]) {
      acc[monthKey] = { name: monthKey, goals: 0, assists: 0 };
    }
    acc[monthKey].goals += s.goals;
    acc[monthKey].assists += s.assists;
    return acc;
  }, {} as Record<string, { name: string, goals: number, assists: number }>);

  const data = Object.values(monthlyData);

  return (
    <div className="w-full h-64 bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Gols Mensais</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.length > 0 ? data : [{ name: 'N/A', goals: 0, assists: 0 }]}>
          <defs>
            <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="goals"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorGoals)"
            strokeWidth={3}
            name={t.goals}
          />
          <Area
            type="monotone"
            dataKey="assists"
            stroke="#3b82f6"
            fillOpacity={0}
            strokeWidth={2}
            strokeDasharray="5 5"
            name={t.assists}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
