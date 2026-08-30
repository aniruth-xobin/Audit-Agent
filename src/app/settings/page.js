"use client";
import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Monitor, Moon, Sun, Palette, Droplets, LayoutTemplate, Activity } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, colorMode, setColorMode, chartStyle, setChartStyle } = useSettings();

  return (
    <div className="flex flex-col gap-6 p-2 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">UI Settings</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Configure your dashboard appearance and data visualization styles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Theme Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-[var(--chart-cyan)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Theme Preference</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Select your preferred application interface theme.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all ${
                theme === 'dark' ? 'border-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-[var(--chart-cyan)]' : 'text-[var(--text-muted-dark)]'}`} />
              <span className="font-medium text-[var(--text-primary)]">Dark Mode</span>
            </button>
            <button 
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all ${
                theme === 'light' ? 'border-[var(--chart-cyan)] bg-[var(--chart-cyan)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-[var(--chart-cyan)]' : 'text-[var(--text-muted-dark)]'}`} />
              <span className="font-medium text-[var(--text-primary)]">Light Mode</span>
            </button>
          </div>
        </div>

        {/* Color Palette Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-[var(--chart-purple)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Color Scheme</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Choose between distinct chart colors or a unified monochromatic base.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setColorMode('colorful')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all ${
                colorMode === 'colorful' ? 'border-[var(--chart-purple)] bg-[var(--chart-purple)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <div className="flex gap-1 h-8 items-center">
                <div className="w-4 h-4 rounded-full bg-[var(--chart-cyan)]"></div>
                <div className="w-4 h-4 rounded-full bg-[var(--chart-purple)]"></div>
                <div className="w-4 h-4 rounded-full bg-[var(--chart-orange)]"></div>
              </div>
              <span className="font-medium text-[var(--text-primary)]">Colorful</span>
            </button>
            <button 
              onClick={() => setColorMode('mono')}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg border transition-all ${
                colorMode === 'mono' ? 'border-[var(--chart-purple)] bg-[var(--chart-purple)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <Droplets className={`w-8 h-8 ${colorMode === 'mono' ? 'text-[var(--chart-purple)]' : 'text-[var(--text-muted-dark)]'}`} />
              <span className="font-medium text-[var(--text-primary)]">Monochromatic</span>
            </button>
          </div>
        </div>

        {/* Chart Style Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-[var(--chart-orange)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data Visualization Style</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-6">Select how data is rendered across the application's charts.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setChartStyle('matrix')}
              className={`flex flex-col items-start gap-3 p-4 rounded-lg border transition-all text-left ${
                chartStyle === 'matrix' ? 'border-[var(--chart-orange)] bg-[var(--chart-orange)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <div className="flex justify-between w-full items-center">
                <span className="font-medium text-[var(--text-primary)]">Dot Matrix (Default)</span>
                <LayoutTemplate className={`w-5 h-5 ${chartStyle === 'matrix' ? 'text-[var(--chart-orange)]' : 'text-[var(--text-muted-dark)]'}`} />
              </div>
              <p className="text-xs text-[var(--text-muted)]">Uses the retro dashed/dot-matrix pattern for dense data visualizations (city skyline style).</p>
            </button>
            <button 
              onClick={() => setChartStyle('solid')}
              className={`flex flex-col items-start gap-3 p-4 rounded-lg border transition-all text-left ${
                chartStyle === 'solid' ? 'border-[var(--chart-orange)] bg-[var(--chart-orange)]/10' : 'border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              <div className="flex justify-between w-full items-center">
                <span className="font-medium text-[var(--text-primary)]">Solid Fill</span>
                <div className="w-5 h-5 bg-[var(--text-muted-dark)] rounded-sm"></div>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Uses clean, modern solid fills for bars and charts. Excellent for accessibility.</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
