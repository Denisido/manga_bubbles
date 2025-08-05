window.renderReady = false;

window.renderBubbles = async function (points) {
  const stage = new Konva.Stage({
    container: 'container',
    width: 1024,
    height: 1024
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

// Создание пути пузыря с плавным хвостиком
function createBubblePath(point) {
  const w = point.width;
  const h = point.height;
  const rX = w / 2;
  const rY = h / 2;

  const segments = 32;
  const irregularity = point.irregularity ?? 0;
  const points = [];

  // Генерация точек пузыря
  for (let i = 0; i < segments; i++) {
    const angle = (Math.PI * 2 * i) / segments;
    const radiusX = rX * (1 + (Math.random() - 0.5) * irregularity);
    const radiusY = rY * (1 + (Math.random() - 0.5) * irregularity);
    points.push({
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      angle
    });
  }

  // Определяем угол хвостика
  let tailIndex = null;
  if (point.hasTail && point.style !== "thought") {
    const dx = point.anchorX - point.x;
    const dy = point.anchorY - point.y;
    const tailAngle = Math.atan2(dy, dx);

    tailIndex = points.reduce((closestIndex, p, idx) => {
      const diff = Math.abs(normalizeAngle(p.angle - tailAngle));
      return diff < Math.abs(normalizeAngle(points[closestIndex].angle - tailAngle))
        ? idx
        : closestIndex;
    }, 0);
  }

  let path = "";
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];

    if (i === 0) {
      path += `M ${p0.x} ${p0.y}`;
    }

    // Вставляем хвостик плавными кривыми
    if (tailIndex !== null && i === tailIndex) {
      const base = p0;
      const dx = point.anchorX - point.x;
      const dy = point.anchorY - point.y;
      const angle = Math.atan2(dy, dx);

      // Шире основание хвоста
      const spread = 0.6; // угол расширения
      const length = 20;  // длина хвоста

      const leftX = base.x + Math.cos(angle + spread) * 14;
      const leftY = base.y + Math.sin(angle + spread) * 14;
      const rightX = base.x + Math.cos(angle - spread) * 14;
      const rightY = base.y + Math.sin(angle - spread) * 14;

      // Более короткий кончик хвоста
      const tipX = base.x + Math.cos(angle) * length;
      const tipY = base.y + Math.sin(angle) * length;

      // Плавная левая кривая
      path += ` Q ${leftX} ${leftY}, ${tipX} ${tipY}`;
      // Плавная правая кривая
      path += ` Q ${rightX} ${rightY}, ${base.x} ${base.y}`;
    }


    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    path += ` Q ${p0.x} ${p0.y}, ${midX} ${midY}`;
  }

  path += " Z";
  return path;
}

function normalizeAngle(angle) {
  return ((angle + Math.PI * 2) % (Math.PI * 2));
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
