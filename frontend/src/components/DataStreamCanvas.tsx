'use client';

import React, { useRef, useEffect } from 'react';

export const DataStreamCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 420);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 550);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Perspective Center (vanishing point)
    const cx = () => width / 2;
    const cy = () => height * 0.48;

    // Floor Perspective Lines Data
    const numFloorLines = 32;
    const floorLines = Array.from({ length: numFloorLines }).map((_, i) => {
      const angle = ((i - numFloorLines / 2) / (numFloorLines / 2)) * (Math.PI * 0.42);
      const isMagenta = i % 2 === 0;
      return {
        angle,
        speed: 0.8 + Math.random() * 1.6,
        offset: Math.random() * 100,
        color: isMagenta ? '#d946ef' : '#38bdf8',
        glowColor: isMagenta ? '#f0abfc' : '#00f0ff',
      };
    });

    // Vertical Shooting Beams Data
    const numVerticalBeams = 22;
    const verticalBeams = Array.from({ length: numVerticalBeams }).map((_, i) => {
      const offsetX = (Math.random() - 0.5) * 60;
      const isCyan = i % 2 === 0;
      return {
        offsetX,
        speed: 1.5 + Math.random() * 3.5,
        offsetY: Math.random() * (height * 0.48),
        length: 50 + Math.random() * 120,
        color: isCyan ? '#00f0ff' : '#e066ff',
      };
    });

    // Horizon Waves
    const waves = [
      { amplitude: 16, frequency: 0.02, speed: 0.03, color: '#00f0ff', yOffset: -8 },
      { amplitude: 22, frequency: 0.015, speed: 0.02, color: '#d946ef', yOffset: 12 },
      { amplitude: 12, frequency: 0.028, speed: 0.04, color: '#818cf8', yOffset: 0 },
    ];

    let frame = 0;

    const render = () => {
      frame++;
      ctx.fillStyle = '#0c1021';
      ctx.fillRect(0, 0, width, height);

      const centerPointX = cx();
      const centerPointY = cy();

      // 1. Draw Horizon Sin Waves
      waves.forEach((w) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 12;

        for (let x = 0; x <= width; x += 4) {
          const y = centerPointY + w.yOffset + Math.sin(x * w.frequency + frame * w.speed) * w.amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });

      // 2. Draw Floor Perspective Lines (Bottom foreground to Horizon Center)
      floorLines.forEach((line) => {
        line.offset = (line.offset + line.speed) % 100;
        const progress = line.offset / 100;

        const startX = centerPointX + Math.tan(line.angle) * (height - centerPointY);
        const startY = height;

        // Base Line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(centerPointX, centerPointY);
        ctx.strokeStyle = line.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // Flowing Packet Light Head (Traveling toward center)
        const currX = startX + (centerPointX - startX) * progress;
        const currY = startY + (centerPointY - startY) * progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(currX, currY, 2.5 + (1 - progress) * 2, 0, Math.PI * 2);
        ctx.fillStyle = line.glowColor;
        ctx.shadowColor = line.glowColor;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Vertical Beams (Shooting UPWARD from Horizon Center into Sky)
      verticalBeams.forEach((beam) => {
        beam.offsetY = (beam.offsetY + beam.speed) % centerPointY;

        const bx = centerPointX + beam.offsetX;
        const startY = centerPointY;
        const endY = centerPointY - beam.offsetY;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bx, startY);
        ctx.lineTo(bx, Math.max(0, endY));
        ctx.strokeStyle = beam.color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = beam.color;
        ctx.shadowBlur = 16;
        ctx.stroke();

        // Particle Tip at Head of Vertical Beam
        if (endY > 0) {
          ctx.beginPath();
          ctx.arc(bx, endY, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Central Horizon Core Glow Flare
      ctx.save();
      const grad = ctx.createRadialGradient(centerPointX, centerPointY, 2, centerPointX, centerPointY, 80);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(217, 70, 239, 0.7)');
      grad.addColorStop(0.6, 'rgba(129, 140, 248, 0.3)');
      grad.addColorStop(1, 'rgba(12, 16, 33, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerPointX, centerPointY, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-l-3xl z-0"
    />
  );
};
