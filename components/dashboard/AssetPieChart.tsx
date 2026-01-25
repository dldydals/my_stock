'use client';

import React from 'react';
import { Card } from 'antd';
import { Pie } from '@ant-design/plots';

interface AssetPieChartProps {
    data: { type: string; value: number }[];
}

export default function AssetPieChart({ data }: AssetPieChartProps) {
    const [isDarkMode, setIsDarkMode] = React.useState(false);

    React.useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkDarkMode();

        // Observe changes to the html class
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const config = {
        data,
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        innerRadius: 0.5,
        theme: isDarkMode ? 'dark' : 'light',
        label: {
            text: (d: any) => {
                const total = data.reduce((sum, item) => sum + item.value, 0);
                const percent = ((d.value / total) * 100).toFixed(1);
                return `${d.type} (${percent}%)`;
            },
            position: 'spider',
            labelLine: {
                style: {
                    lineWidth: 1,
                    stroke: isDarkMode ? '#475569' : '#cbd5e1',
                }
            },
            style: {
                fontSize: 12,
                fontWeight: 600,
                fill: isDarkMode ? '#f8fafc' : '#1e293b',
                stroke: 'none',
            },
        },
        legend: {
            color: {
                position: 'bottom',
                layout: { justify: 'center' },
            }
        },
        tooltip: {
            title: 'type',
            items: [
                (d: any) => ({
                    name: '평가금액',
                    value: `${Math.floor(d.value).toLocaleString()}원`,
                }),
            ],
        },
        interaction: {
            elementHighlight: true,
        },
    };

    return (
        <div style={{ height: 300, padding: '10px 0' }}>
            <Pie {...config} />
        </div>
    );
}
