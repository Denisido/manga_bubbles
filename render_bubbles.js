window.renderReady = false;

window.renderBubbles = async function (points) {
  const stage = new Konva.Stage({
    container: 'container',
    width: 800,
    height: 600
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  for (const point of points) {
    const bubble = await createBubbleFromPoint(point);
    layer.add(bubble);
  }

  layer.draw();
  window.renderReady = true;
};

// Создание пузыря
async function createBubbleFromPoint(point) {
  const group = new Konva.Group({ x: point.x, y: point.y });

  const bubblePath = createBubblePath(point);

  const bubble = new Konva.Path({
    data: bubblePath,
    stroke: point.borderColor,
    strokeWidth: 2,
    fill: point.bubbleColor,
    dash: point.style === 'whisper' ? [5, 3] : []
  });

  group.add(bubble);

  // Точки для мыслей
  if (point.style === 'thought' && point.hasTail) {
    const dots = createThoughtDots(point);
    dots.forEach(dot => group.add(dot));
  }

  // Текст
  const text = new Konva.Text({
    x: -point.width / 2 + 10,
    y: -10,
    text: point.text,
    fontSize: 14,
    fontFamily: 'Arial',
    width: point.width - 20,
    align: 'center'
  });

  group.add(text);
  return group;
}

// Создание пути пузыря с неровностями и плавными кривыми
function createBubblePath(point) {
  const w = point.width;
  const h = point.height;
  const rX = w / 2;
  const rY = h / 2;

  const segments = 24;
  const irregularity = point.irregularity ?? 0; // степень неровности

  const points = [];

  // Генерация точек с неровностью
  for (let i = 0; i < segments; i++) {
    const angle = (Math.PI * 2 * i) / segments;
    const radiusX = rX * (1 + (Math.random() - 0.5) * irregularity);
    const radiusY = rY * (1 + (Math.random() - 0.5) * irregularity);
    points.push({
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY
    });
  }

  // Формируем путь с кривыми Безье
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    path += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
  }
  path += " Z";

  // Хвост (только если есть и не мысль)
  if (point.hasTail && point.style !== "thought") {
    const dx = point.anchorX - point.x;
    const dy = point.anchorY - point.y;
    const angle = Math.atan2(dy, dx);

    const tailBaseX = Math.cos(angle) * rX;
    const tailBaseY = Math.sin(angle) * rY;

    const tailTipX = tailBaseX + Math.cos(angle) * 25;
    const tailTipY = tailBaseY + Math.sin(angle) * 25;

    const leftWingX = tailBaseX + Math.cos(angle + 0.4) * 12;
    const leftWingY = tailBaseY + Math.sin(angle + 0.4) * 12;
    const rightWingX = tailBaseX + Math.cos(angle - 0.4) * 12;
    const rightWingY = tailBaseY + Math.sin(angle - 0.4) * 12;

    path += `
      M ${leftWingX} ${leftWingY}
      L ${tailTipX} ${tailTipY}
      L ${rightWingX} ${rightWingY}
      Z
    `;
  }

  return path;
}

// Точки для мыслей
function createThoughtDots(point) {
  const dx = point.anchorX - point.x;
  const dy = point.anchorY - point.y;
  const angle = Math.atan2(dy, dx);

  const dots = [];
  const baseX = Math.cos(angle) * (point.width / 2);
  const baseY = Math.sin(angle) * (point.height / 2);

  const positions = [
    { r: 6, dist: 20 },
    { r: 4, dist: 35 },
    { r: 3, dist: 50 }
  ];

  positions.forEach(pos => {
    dots.push(
      new Konva.Circle({
        x: baseX + Math.cos(angle) * pos.dist,
        y: baseY + Math.sin(angle) * pos.dist,
        radius: pos.r,
        fill: point.bubbleColor,
        stroke: point.borderColor
      })
    );
  });

  return dots;
}
