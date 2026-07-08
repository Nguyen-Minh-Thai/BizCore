/* ===== BizCore ERP - Canvas Charts ===== */
window.Charts = {
  COLORS: ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316','#06b6d4'],

  _setup(canvasId, minH) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const container = canvas.parentElement;
    const w = container.clientWidth || 400;
    const h = Math.max(minH || 250, 220);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  },

  bar(canvasId, config) {
    const setup = this._setup(canvasId, config.options?.height || 260);
    if (!setup) return;
    const { ctx, w, h } = setup;
    const { labels, datasets } = config;
    const data = datasets[0].data;
    const color = datasets[0].color || this.COLORS[0];
    const max = Math.max(...data, 1) * 1.15;
    const padL = 55, padR = 20, padT = 30, padB = 50; // Increased padT to prevent value labels clipping
    const chartW = w - padL - padR, chartH = h - padT - padB;
    const barW = Math.min(40, chartW / data.length * 0.6);
    const gap = chartW / data.length;

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      const val = Math.round(max - (max / 4) * i);
      ctx.fillText(val >= 1000000 ? (val/1000000).toFixed(0) + 'M' : val.toLocaleString(), padL - 8, y + 4);
    }

    // Animate bars
    let progress = 0;
    const animate = () => {
      progress = Math.min(1, progress + 0.04);
      // Clear bar area
      ctx.clearRect(padL, padT - 15, chartW + padR, chartH + 17);
      // Redraw grid
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      }
      // Bars
      data.forEach((val, i) => {
        const x = padL + gap * i + (gap - barW) / 2;
        const barH = (val / max) * chartH * progress;
        const y = padT + chartH - barH;
        const grd = ctx.createLinearGradient(x, y, x, padT + chartH);
        grd.addColorStop(0, datasets.length > 1 ? (this.COLORS[i % this.COLORS.length]) : color);
        grd.addColorStop(1, datasets.length > 1 ? (this.COLORS[i % this.COLORS.length] + '44') : (color + '44'));
        ctx.fillStyle = grd;
        // Rounded top
        const r = Math.min(4, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x, padT + chartH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, padT + chartH);
        ctx.fill();

        // Draw the value above the bar
        if (progress >= 1) {
          ctx.fillStyle = datasets.length > 1 ? (this.COLORS[i % this.COLORS.length]) : color;
          ctx.font = 'bold 11px Inter,sans-serif';
          ctx.textAlign = 'center';
          let formattedVal = '';
          const isPercentage = config.isPercentage || datasets[0].label?.includes('%') || datasets[0].label?.includes('Tỷ lệ') || datasets[0].label?.includes('OLE');
          if (isPercentage) {
            formattedVal = val + '%';
          } else {
            if (val >= 1000000000) {
              formattedVal = (val / 1000000000).toFixed(2) + 'B';
            } else if (val >= 1000000) {
              formattedVal = (val / 1000000).toFixed(1) + 'M';
            } else {
              formattedVal = val.toLocaleString();
            }
          }
          ctx.fillText(formattedVal, x + barW / 2, y - 6);
        }
      });

      if (progress < 1) requestAnimationFrame(animate);
    };

    // Labels
    labels.forEach((label, i) => {
      const x = padL + gap * i + gap / 2;
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
      const shortLabel = label.length > 25 ? label.substring(0, 22) + '…' : label;
      ctx.fillText(shortLabel, x, h - padB + 18);
    });

    animate();
  },

  line(canvasId, config) {
    const setup = this._setup(canvasId, config.options?.height || 260);
    if (!setup) return;
    const { ctx, w, h } = setup;
    const { labels, datasets } = config;
    const allData = datasets.flatMap(d => d.data);
    const max = Math.max(...allData, 1) * 1.15;
    const min = 0;
    const padL = 65, padR = 20, padT = 20, padB = 50;
    const chartW = w - padL - padR, chartH = h - padT - padB;

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
      const val = Math.round(max - ((max - min) / 4) * i);
      ctx.fillText(val >= 1000000 ? (val/1000000).toFixed(0) + 'M' : val.toLocaleString(), padL - 8, y + 4);
    }

    // Labels
    labels.forEach((label, i) => {
      const x = padL + (chartW / (labels.length - 1 || 1)) * i;
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, x, h - padB + 18);
    });

    // Animate lines
    let progress = 0;
    const animate = () => {
      progress = Math.min(1, progress + 0.03);
      ctx.clearRect(padL - 1, padT - 1, chartW + 2, chartH + 2);
      // Redraw grid
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      }

      datasets.forEach((ds, di) => {
        const color = ds.color || this.COLORS[di];
        const points = ds.data.map((val, i) => ({
          x: padL + (chartW / (labels.length - 1 || 1)) * i,
          y: padT + chartH - ((val - min) / (max - min)) * chartH
        }));

        const drawCount = Math.ceil(points.length * progress);

        // Fill area
        if (ds.fill !== false) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, padT + chartH);
          for (let i = 0; i < drawCount; i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.lineTo(points[drawCount - 1].x, padT + chartH);
          ctx.closePath();
          const grd = ctx.createLinearGradient(0, padT, 0, padT + chartH);
          grd.addColorStop(0, color + '30'); grd.addColorStop(1, color + '05');
          ctx.fillStyle = grd; ctx.fill();
        }

        // Line
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        for (let i = 0; i < drawCount; i++) {
          if (i === 0) ctx.moveTo(points[i].x, points[i].y);
          else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Dots
        for (let i = 0; i < drawCount; i++) {
          ctx.beginPath(); ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#12121f'; ctx.fill();
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        }
      });

      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();

    // Legend
    if (datasets.length > 1) {
      const legendY = h - 12;
      let legendX = padL;
      datasets.forEach((ds, i) => {
        ctx.fillStyle = ds.color || this.COLORS[i];
        ctx.fillRect(legendX, legendY - 6, 12, 3);
        ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(ds.label, legendX + 16, legendY);
        legendX += ctx.measureText(ds.label).width + 36;
      });
    }
  },

  doughnut(canvasId, config) {
    const setup = this._setup(canvasId, config.options?.height || 250);
    if (!setup) return;
    const { ctx, w, h } = setup;
    const labels = config.labels || [];
    const ds0 = (config.datasets && config.datasets[0]) || {};
    const data = config.data || ds0.data || [];
    const colors = config.colors || ds0.backgroundColor || [];
    const total = data.reduce((s, v) => s + v, 0) || 1;
    const cx = w * 0.38, cy = h / 2;
    const radius = Math.min(cx - 20, cy - 20, 90);
    const innerRadius = radius * 0.62;
    const gap = 0.03;

    let progress = 0;
    const animate = () => {
      progress = Math.min(1, progress + 0.03);
      ctx.clearRect(0, 0, w, h);

      let startAngle = -Math.PI / 2;
      data.forEach((val, i) => {
        const slice = (val / total) * Math.PI * 2 * progress;
        const actualGap = slice > gap * 2 ? gap : 0;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle + actualGap, startAngle + slice - actualGap);
        ctx.arc(cx, cy, innerRadius, startAngle + slice - actualGap, startAngle + actualGap, true);
        ctx.closePath();
        ctx.fillStyle = (colors && colors[i]) || this.COLORS[i % this.COLORS.length];
        ctx.fill();
        startAngle += slice;
      });

      // Center text
      ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 20px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(total.toLocaleString(), cx, cy + 2);
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif';
      ctx.fillText('Tổng', cx, cy + 18);

      // Draw slice percentages and component names inside doughnut slices
      if (progress >= 1) {
        let startAngle = -Math.PI / 2;
        data.forEach((val, i) => {
          const slice = (val / total) * Math.PI * 2;
          const pct = Math.round((val / total) * 100);
          if (pct >= 5) {
            const angle = startAngle + slice / 2;
            const dist = (radius + innerRadius) / 2;
            const lx = cx + Math.cos(angle) * dist;
            const ly = cy + Math.sin(angle) * dist;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Lấy tên thành phần sạch từ nhãn
            const fullLabel = labels[i] || '';
            const cleanName = fullLabel.split(' (')[0];
            
            if (pct >= 12) {
              // Vẽ cả Tên và % nếu lát cắt đủ rộng
              ctx.font = 'bold 8.5px Inter,sans-serif';
              ctx.fillText(cleanName, lx, ly - 5);
              ctx.font = 'bold 9px Inter,sans-serif';
              ctx.fillText(pct + '%', lx, ly + 5);
            } else {
              // Vẽ % nếu lát cắt hẹp hơn
              ctx.font = 'bold 9.5px Inter,sans-serif';
              ctx.fillText(pct + '%', lx, ly);
            }
          }
          startAngle += slice;
        });
      }

      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();

    // Legend (right side)
    const legendX = w * 0.65;
    let legendY = Math.max(30, cy - (labels.length * 24) / 2);
    labels.forEach((label, i) => {
      const color = (colors && colors[i]) || this.COLORS[i % this.COLORS.length];
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(legendX, legendY, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1f5f9'; ctx.font = '12px Inter,sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 14, legendY + 4);
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter,sans-serif';
      const pct = Math.round((data[i] / total) * 100);
      ctx.fillText(`${data[i].toLocaleString()} (${pct}%)`, legendX + 14, legendY + 20);
      legendY += 36;
    });
  }
};
