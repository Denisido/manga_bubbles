console.log("RENDER_BUBBLES.JS LOADED!");

window.renderReady = false;

// --- Получение query-параметров ---
function getQueryParams() {
  const params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str, key, value) {
    params[key] = decodeURIComponent(value);
  });
  return params;
}

// --- Определение режима работы ---
const params = getQueryParams();
const MODE = window.trialMode || params.mode || 'main';

// --- Определение путей и сценария в зависимости от режима ---
let bgImagePath, scenarioPromise;

console.log("LOADED render_bubbles.js!");
console.log("MODE:", MODE, "trialScenario:", !!window.trialScenario, "params.scenario:", params.scenario);
if (window.trialScenario) {
  console.log("trialScenario (short):", Array.isArray(window.trialScenario), window.trialScenario.length);
}
// === Режим для экспериментов ===
if (MODE === 'trial') {
  bgImagePath = window.trialBg || params.bg || '/static/blank_1024.png';

  if (window.trialScenario) {
    scenarioPromise = Promise.resolve(window.trialScenario);
  } else {
    // fetch не будет работать! Можно кинуть ошибку или показать предупреждение
    console.log("В режиме trial сценарий должен быть передан через window.trialScenario (fetch не поддерживается в file://)");
    throw new Error("trialScenario not provided in window");
  }
}
// === Основной режим ===
else {
  bgImagePath = '/static/blank_1024.png'; // можно заменить на боевой фон
  scenarioPromise = fetch('/data/scenario.json').then(r => r.json());
}

console.log("=== MODE:", MODE, "trialScenario:", !!window.trialScenario, "params.scenario:", params.scenario);

// ❗️Список плохих слов для переноса (не начинать с них строку)
const BAD_START = [
  'и', 'а', 'но', 'же', 'да', 'или', 'что', 'как', 'ну', 'то',
  'по', 'не', 'на', 'за', 'от', 'со', 'из', 'у', 'во', 'ли', 'бы', 'же'
];

function getVisualWidth(text, fontSize = 36, fontFamily = 'Arial') {
  const temp = new Konva.Text({
    text,
    fontSize,
    fontFamily,
    visible: false
  });
  return temp.getClientRect().width;
}

function smartVisualWrap(text, fontSize = 36, fontFamily = 'Arial') {
  const words = text.split(' ');
  if (words.length < 2) return text;

  let bestSplit = 1;
  let bestScore = Infinity;

  for (let i = 1; i < words.length; i++) {
    if (BAD_START.includes(words[i].toLowerCase())) continue;

    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const w1 = getVisualWidth(line1, fontSize, fontFamily);
    const w2 = getVisualWidth(line2, fontSize, fontFamily);

    const diff = Math.abs(w1 - w2);
    const maxLen = Math.max(w1, w2);
    const minLen = Math.min(w1, w2);
    const balancePenalty = (minLen / maxLen < 0.6) ? 999 : 0;
    const centerPenalty = Math.abs(i - words.length / 2) * 2;

    const score = diff + balancePenalty + centerPenalty;
    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }

  if (bestScore === Infinity) return text;

  return words.slice(0, bestSplit).join(' ') + '\n' + words.slice(bestSplit).join(' ');
}


// Ф-ция валидации сценария (корректное проставление координат пузырей)
const AUTO_FIX_BUBBLES = true; // <-- меняй на true если хочешь автофиксы!

function validateBubbles(scenarios) {
  scenarios.forEach((scene, frameIdx) => {
    const frame = scene.scenario;
    const bubbles = scene.speechBubble;
    if (!bubbles || !Array.isArray(bubbles)) return;

    bubbles.forEach((bubble, bubbleIdx) => {
      // Преобразуем координаты в глобальные
      const globalX = frame.x + bubble.x;
      const globalY = frame.y + bubble.y;
      const width = bubble.width || 0;
      const height = bubble.height || 0;

      // Проверяем, помещается ли пузырь целиком в свой кадр
      const left = globalX - width / 2;
      const right = globalX + width / 2;
      const top = globalY - height / 2;
      const bottom = globalY + height / 2;

      const fits =
        left >= frame.x &&
        right <= frame.x + frame.width &&
        top >= frame.y &&
        bottom <= frame.y + frame.height;

      if (!fits) {
        console.warn(
          `⚠️ Пузырь ${bubbleIdx + 1} кадра ${frameIdx + 1} выходит за границы кадра!\n` +
          `globalX: ${globalX} [${left} ... ${right}] — frame.x: ${frame.x} ... ${frame.x + frame.width}\n` +
          `globalY: ${globalY} [${top} ... ${bottom}] — frame.y: ${frame.y} ... ${frame.y + frame.height}\n`
        );
        if (AUTO_FIX_BUBBLES) {
          // Исправляем координаты на максимально допустимые
          const fixedX = Math.min(Math.max(globalX, frame.x + width/2), frame.x + frame.width - width/2);
          const fixedY = Math.min(Math.max(globalY, frame.y + height/2), frame.y + frame.height - height/2);

          // Возвращаем координаты обратно в ЛОКАЛЬНУЮ систему пузыря
          bubble.x = fixedX - frame.x;
          bubble.y = fixedY - frame.y;

          console.log(
            `✅ bubble ${bubbleIdx + 1} frame ${frameIdx + 1} автоисправлен на x:${bubble.x}, y:${bubble.y}`
          );
        }
      }
    });
  });
}






window.renderBubbles = async function (scenarios) {
  // Валидация координат пузырей для каждого кадра
  validateBubbles(scenarios);

  const stage = new Konva.Stage({
    container: 'container',
    width: 1024,
    height: 1024
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  // --- Добавим фон ---
  const bgImg = new window.Image();
  bgImg.src = bgImagePath;
  await new Promise((resolve) => { bgImg.onload = resolve; });
  const bg = new Konva.Image({
    image: bgImg,
    x: 0, y: 0, width: 1024, height: 1024
  });
  layer.add(bg);

  // Перебираем все кадры (scenarios)
  scenarios.forEach((scene, frameIdx) => {
    const frame = scene.scenario;
    const bubbles = scene.speechBubble;

    // === Обрисовка фрейма (кадра) ===
    if (frame) {
      layer.add(new Konva.Rect({
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        stroke: 'rgba(100,0,255,0.7)',
        strokeWidth: 2,
        dash: [8, 4]
      }));

      // Подпись номера кадра
      layer.add(new Konva.Text({
        x: frame.x + 8,
        y: frame.y + 8,
        text: `Кадр ${frameIdx + 1}`,
        fontSize: 22,
        fill: '#4700fa',
        fontStyle: 'bold'
      }));
    }

    if (!bubbles || !Array.isArray(bubbles)) return;

    bubbles.forEach((bubble, bubbleIdx) => {
      // переводим локальные координаты пузыря в глобальные
      const globalBubble = { ...bubble };
      globalBubble.x = frame.x + bubble.x;
      globalBubble.y = frame.y + bubble.y;

      // anchorX/Y — тоже переводим (но только если hasTail)
      if (bubble.hasTail) {
        globalBubble.anchorX = frame.x + bubble.anchorX;
        globalBubble.anchorY = frame.y + bubble.anchorY;
      }

      createBubbleFromPoint(globalBubble).then(bubbleGroup => {
        layer.add(bubbleGroup);

        // 🔴 Маркер центра пузыря (для триального режима)
        if (MODE === 'trial') {
          const marker = new Konva.Circle({
            x: 0,
            y: 0,
            radius: 3,
            fill: 'red'
          });
          bubbleGroup.add(marker);
        }

        // === Подпись к пузырю ===
        layer.add(new Konva.Text({
          x: globalBubble.x - globalBubble.width / 2,
          y: globalBubble.y + globalBubble.height / 2 + 6,
          text: `Пузырь ${bubbleIdx + 1}\n(x:${Math.round(globalBubble.x)}, y:${Math.round(globalBubble.y)})`,
          fontSize: 16,
          fill: '#c50',
          fontStyle: 'italic'
        }));
      });
    });
  });

  // Дожидаемся всех асинхронных пузырей
  await new Promise(r => setTimeout(r, 120)); // на всякий случай!

  layer.draw();
  console.log("CALL renderReady! scenarios:", scenarios);
  window.renderReady = true;
};

// ... всё остальное без изменений ...
// (функции createBubbleFromPoint, createBubblePath, createThoughtDots и т.д.)


// Основная функция создания пузыря
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

  // Мысленные точки
  if (point.style === 'thought' && point.hasTail) {
    const dots = createThoughtDots(point);
    dots.forEach(dot => group.add(dot));
  }

  // --- 📦 Умная авторазбивка и подбор размера текста ---
  const paddingX = point.width * 0.12;
  const paddingY = point.height * 0.12;

  const maxWidth = point.width - paddingX * 2;
  const maxHeight = point.height - paddingY * 2;

  // Для старта fontSize — пусть будет 0.8 от меньшей стороны блока (можно играть с этим коэффициентом!)
  let fontSize = Math.floor(Math.min(point.width, point.height) * 0.8);
  let fitted = false;
  let tempText;
  let renderText = point.text;

  while (fontSize >= 10 && !fitted) {
    // Для очень коротких однострочных текстов делаем умный перенос!
    if (
      renderText.split('\n').length === 1 &&
      renderText.split(' ').length >= 2
    ) {
      renderText = smartVisualWrap(point.text, fontSize, 'Arial');
    } else {
      renderText = point.text;
    }

    tempText = new Konva.Text({
      x: -point.width / 2 + paddingX,
      y: -point.height / 2 + paddingY,
      width: maxWidth,
      text: renderText,
      fontSize: fontSize,
      fontFamily: 'Arial',
      align: 'center',
      verticalAlign: 'middle',
      wrap: 'word',
      lineHeight: 1.2
    });

    const actualRect = tempText.getClientRect();
    const actualWidth = actualRect.width;
    const actualHeight = actualRect.height;

    if (actualHeight <= maxHeight && actualWidth <= maxWidth) {
      fitted = true;
    } else {
      fontSize -= 1;
    }
  }

  // Центрирование по вертикали вручную
  const actualTextHeight = tempText.getClientRect().height;
  const offsetY = (maxHeight - actualTextHeight) / 2;
  tempText.y(tempText.y() + offsetY);

  group.add(tempText);
  return group;
}

// Хвост
function createBubblePath(point) {
  const w = point.width;
  const h = point.height;
  const rX = w / 2;
  const rY = h / 2;

  const segments = 32;
  const irregularity = point.irregularity ?? 0;
  const points = [];

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

    if (tailIndex !== null && i === tailIndex) {
      const base = p0;
      const dx = point.anchorX - point.x;
      const dy = point.anchorY - point.y;
      const angle = Math.atan2(dy, dx);

      const leftX = base.x + Math.cos(angle + 0.4) * 12;
      const leftY = base.y + Math.sin(angle + 0.4) * 12;
      const rightX = base.x + Math.cos(angle - 0.4) * 12;
      const rightY = base.y + Math.sin(angle - 0.4) * 12;

      const tipX = base.x + Math.cos(angle) * 30;
      const tipY = base.y + Math.sin(angle) * 30;

      path += ` Q ${leftX} ${leftY}, ${tipX} ${tipY}`;
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

// Точки для мысленного пузыря
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
