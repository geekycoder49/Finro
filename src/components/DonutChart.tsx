import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Line } from 'react-native-svg';
import { getCategoryIcon } from '../utils/categoryIcons';

interface DataItem {
    value: number;
    color: string;
    label: string;
}

interface DonutChartProps {
    data: DataItem[];
    radius?: number;
    innerRadius?: number;
    currency: string;
    textColor: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
    data,
    radius = 65,
    innerRadius = 45,
    currency,
    textColor
}) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    // Increased padding for icons
    const size = (radius + 65) * 2;
    const center = size / 2;

    if (total === 0) return null;

    // Filter data to only show categories with significant enough value or top 6 to avoid mess
    const displayData = [...data]
        .sort((a, b) => b.value - a.value)
        .slice(0, 7); // Show max 7 categories on chart to avoid mess

    let startAngle = -90;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <G x={center} y={center}>
                    {displayData.map((item, index) => {
                        const sliceAngle = (item.value / total) * 360;
                        const isFullCircle = sliceAngle >= 360;
                        const effectiveEndAngle = isFullCircle ? startAngle + 359.995 : startAngle + sliceAngle;

                        const x1 = radius * Math.cos((startAngle * Math.PI) / 180);
                        const y1 = radius * Math.sin((startAngle * Math.PI) / 180);
                        const x2 = radius * Math.cos((effectiveEndAngle * Math.PI) / 180);
                        const y2 = radius * Math.sin((effectiveEndAngle * Math.PI) / 180);

                        const ix1 = innerRadius * Math.cos((startAngle * Math.PI) / 180);
                        const iy1 = innerRadius * Math.sin((startAngle * Math.PI) / 180);
                        const ix2 = innerRadius * Math.cos((effectiveEndAngle * Math.PI) / 180);
                        const iy2 = innerRadius * Math.sin((effectiveEndAngle * Math.PI) / 180);

                        const largeArcFlag = sliceAngle > 180 ? 1 : 0;

                        const pathData = [
                            `M ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            `L ${ix2} ${iy2}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
                            'Z'
                        ].join(' ');

                        const midAngle = startAngle + sliceAngle / 2;
                        const lx = (radius + 5) * Math.cos((midAngle * Math.PI) / 180);
                        const ly = (radius + 5) * Math.sin((midAngle * Math.PI) / 180);
                        const ex = (radius + 25) * Math.cos((midAngle * Math.PI) / 180);
                        const ey = (radius + 25) * Math.sin((midAngle * Math.PI) / 180);

                        startAngle += sliceAngle;

                        return (
                            <G key={index}>
                                <Path d={pathData} fill={item.color} />
                                <Line
                                    x1={lx} y1={ly}
                                    x2={ex} y2={ey}
                                    stroke={item.color}
                                    strokeWidth={1.5}
                                    opacity={0.6}
                                />
                            </G>
                        );
                    })}
                </G>
            </Svg>

            {/* Overlay for Icons and Percentages */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                {(() => {
                    let sAngle = -90;
                    return displayData.map((item, index) => {
                        const sliceAngle = (item.value / total) * 360;
                        const midAngle = sAngle + sliceAngle / 2;
                        const dist = radius + 40;
                        const iconX = center + dist * Math.cos((midAngle * Math.PI) / 180) - 15;
                        const iconY = center + dist * Math.sin((midAngle * Math.PI) / 180) - 20;

                        const percentage = ((item.value / total) * 100).toFixed(0);
                        sAngle += sliceAngle;

                        return (
                            <View key={index} style={{ position: 'absolute', left: iconX, top: iconY, alignItems: 'center', width: 30 }}>
                                <View style={{ padding: 4, backgroundColor: item.color + '20', borderRadius: 8, marginBottom: 2 }}>
                                    {getCategoryIcon(item.label, 14, item.color)}
                                </View>
                                <Text style={{ color: textColor, fontSize: 10, fontWeight: '700' }}>{percentage}%</Text>
                            </View>
                        );
                    });
                })()}

                {/* Center Label */}
                <View style={{ alignItems: 'center', backgroundColor: 'transparent' }}>
                    <Text style={{ color: textColor, fontSize: 10, opacity: 0.6 }}>Total</Text>
                    <Text style={{ color: textColor, fontSize: 14, fontWeight: 'bold' }}>
                        {total.toLocaleString()}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default DonutChart;
