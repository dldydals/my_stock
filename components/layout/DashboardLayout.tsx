'use client';

import { ConfigProvider, theme, Button, App } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import StyledComponentsRegistry from '../../lib/AntdRegistry';
import { useState, useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            setIsDarkMode(false);
        } else {
            setIsDarkMode(true);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode, mounted]);

    // Show a dark background during initial mount to prevent white flash
    if (!mounted) return <div style={{ background: '#020617', minHeight: '100vh' }} />;

    return (
        <StyledComponentsRegistry>
            <ConfigProvider
                theme={{
                    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                    token: {
                        fontSize: 14,
                        borderRadius: 12,
                        colorPrimary: '#3b82f6',
                        colorBgContainer: isDarkMode ? '#0f172a' : 'transparent',
                        colorTextBase: isDarkMode ? '#f8fafc' : '#0f172a',
                        fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    },
                    components: {
                        Table: {
                            fontSize: 13,
                            paddingContentVertical: 12,
                            headerBg: isDarkMode ? '#1e293b' : '#f1f5f9',
                        },
                        Card: {
                            paddingLG: 20,
                            borderRadiusLG: 16,
                            colorBgContainer: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.65)',
                        },
                        Statistic: {
                            contentFontSize: 24,
                            titleFontSize: 13,
                        }
                    }
                }}
            >
                <App>
                    <div className="min-h-screen transition-all duration-500 relative bg-background text-foreground">
                        <div className="fixed top-6 right-8 z-[100]">
                            <Button
                                shape="circle"
                                size="large"
                                icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.05)',
                                    color: isDarkMode ? '#fcd34d' : '#1e293b',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: isDarkMode ? '0 0 20px rgba(59, 130, 246, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)'
                                }}
                            />
                        </div>
                        <div className="max-container px-4 py-8 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </div>
                </App>
            </ConfigProvider>
        </StyledComponentsRegistry>
    );
}
