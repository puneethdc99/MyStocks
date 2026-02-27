/* ═══════════════════════════════════════════
   charts.js — Lightweight Charts Wrapper
   Sparklines + Full Detail Charts
═══════════════════════════════════════════ */
const Charts = (() => {
    const chartInstances = new Map();

    /* ── LightweightCharts theme config ── */
    const CHART_THEME = {
        layout: {
            background: { color: 'transparent' },
            textColor: '#9ca3af',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: 'rgba(30, 45, 69, 0.5)' },
            horzLines: { color: 'rgba(30, 45, 69, 0.5)' },
        },
        crosshair: {
            vertLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#1e3a5f' },
            horzLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#1e3a5f' },
        },
        timeScale: {
            borderColor: 'rgba(30, 45, 69, 0.6)',
            timeVisible: true,
            secondsVisible: false,
        },
        rightPriceScale: {
            borderColor: 'rgba(30, 45, 69, 0.6)',
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
    };

    /* ── Destroy existing chart in container ── */
    function destroyChart(containerId) {
        if (chartInstances.has(containerId)) {
            try { chartInstances.get(containerId).remove(); } catch { }
            chartInstances.delete(containerId);
        }
    }

    /* ── Area Chart (for stock detail) ── */
    function renderAreaChart(containerId, data, isPositive = true) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.length) return;

        destroyChart(containerId);
        container.innerHTML = '';

        const color = isPositive ? '#22c55e' : '#ef4444';
        const chart = LightweightCharts.createChart(container, {
            ...CHART_THEME,
            width: container.clientWidth || 600,
            height: container.clientHeight || 300,
        });

        const areaSeries = chart.addAreaSeries({
            lineColor: color,
            topColor: isPositive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            bottomColor: 'rgba(0,0,0,0)',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            crosshairMarkerBackgroundColor: color,
        });

        const seriesData = data.map(d => ({ time: d.time, value: d.value || d.close }));
        areaSeries.setData(seriesData);
        chart.timeScale().fitContent();

        // Force a resize once the browser has finished painting the container.
        // Without this, clientWidth can be 0 on first open (section just showed),
        // producing a blank chart until the user clicks a period button.
        requestAnimationFrame(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0) {
                chart.applyOptions({ width: w, height: h || 300 });
                chart.timeScale().fitContent();
            }
        });

        // Resize observer (handles subsequent window/panel resizes)
        const ro = new ResizeObserver(() => {
            chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
        });
        ro.observe(container);

        chartInstances.set(containerId, chart);
        return chart;
    }

    /* ── Candlestick Chart (for stock detail) ── */
    function renderCandlestickChart(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.length) return;

        destroyChart(containerId);
        container.innerHTML = '';

        const chart = LightweightCharts.createChart(container, {
            ...CHART_THEME,
            width: container.clientWidth || 600,
            height: container.clientHeight || 300,
        });

        const candleSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        candleSeries.setData(data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        })));
        chart.timeScale().fitContent();

        // Resize observer
        const ro = new ResizeObserver(() => {
            chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
        });
        ro.observe(container);

        chartInstances.set(containerId, chart);
        return chart;
    }

    /* ── Mini Sparkline (watchlist cards, index cards) ── */
    function renderSparkline(containerId, data, isPositive = true) {
        const container = document.getElementById(containerId);
        if (!container || !data || !data.length) return;

        // Clean out old chart
        if (chartInstances.has(containerId)) {
            try { chartInstances.get(containerId).remove(); } catch { }
            chartInstances.delete(containerId);
        }
        container.innerHTML = '';

        const color = isPositive ? '#22c55e' : '#ef4444';
        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { color: 'transparent' },
                textColor: 'transparent',
                fontFamily: 'Inter',
            },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            crosshair: { mode: 0 },
            timeScale: { visible: false },
            rightPriceScale: { visible: false },
            leftPriceScale: { visible: false },
            handleScroll: false,
            handleScale: false,
            width: container.clientWidth || 150,
            height: container.clientHeight || 40,
        });

        const line = chart.addAreaSeries({
            lineColor: color,
            topColor: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            bottomColor: 'rgba(0,0,0,0)',
            lineWidth: 1.5,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
        });

        const seriesData = data.map(d => ({ time: d.time, value: d.value || d.close || 0 }));
        line.setData(seriesData);
        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
            chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
        });
        ro.observe(container);

        chartInstances.set(containerId, chart);
        return chart;
    }

    /* ── Bar Sparkline (fallback using canvas when LW doesn't fit) ── */
    function renderBarSparkline(canvas, data, isPositive = true) {
        if (!canvas || !data.length) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const vals = data.map(d => d.value || d.close || 0);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const range = max - min || 1;
        const color = isPositive ? '#22c55e' : '#ef4444';

        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        vals.forEach((v, i) => {
            const x = (i / (vals.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // fill
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        ctx.fillStyle = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
        ctx.fill();
    }

    return {
        renderAreaChart, renderCandlestickChart,
        renderSparkline, renderBarSparkline,
        destroyChart
    };
})();
