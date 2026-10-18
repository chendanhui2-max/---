const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = { metrics: {}, human: {}, activeMetric: null };
const metricConfig = {
  gpa: {
    number: "01 / 05", title: "绩点", hint: "一串经常被用来概括学习状态的数字。",
    fields: [{ key: "gpa", label: "我的绩点", type: "text", placeholder: "例如 3.7 / 4.0，或保密" }],
    summary: (v) => v.gpa || "保密"
  },
  rank: {
    number: "02 / 05", title: "排名", hint: "你在一行名单上的位置。",
    fields: [{ key: "rank", label: "我的排名区间", type: "select", options: ["前 5%", "前 10%", "前 30%", "前 50%", "50% 以后", "不清楚", "不想填写"] }],
    summary: (v) => v.rank || "不想填写"
  },
  intern: {
    number: "03 / 05", title: "实习数量", hint: "一段段经历，在简历里被压缩成几个条目。",
    fields: [{ key: "intern", label: "已经完成的实习", type: "number", placeholder: "0" }],
    summary: (v) => `${v.intern || 0} 段`
  },
  award: {
    number: "04 / 05", title: "获奖数量", hint: "容易被看见的高光时刻。",
    fields: [{ key: "award", label: "可以写进简历的奖项", type: "number", placeholder: "0" }],
    summary: (v) => `${v.award || 0} 项`
  },
  social: {
    number: "05 / 05", title: "粉丝与点赞", hint: "一次表达获得的即时反馈。",
    fields: [
      { key: "followers", label: "粉丝", type: "text", placeholder: "例如 328" },
      { key: "likes", label: "最近一条动态的点赞", type: "text", placeholder: "例如 47" }
    ],
    summary: (v) => `${v.followers || "—"} 粉丝 / ${v.likes || "—"} 赞`
  }
};

function scatterTitle(element) {
  [...element.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const frag = document.createDocumentFragment();
    [...node.textContent].forEach((char, index) => {
      if (/\s/.test(char)) return frag.appendChild(document.createTextNode(char));
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = char;
      span.style.setProperty("--r", `${((index % 5) - 2) * 0.7}deg`);
      span.style.setProperty("--y", `${(index % 3) - 1}px`);
      frag.appendChild(span);
    });
    node.replaceWith(frag);
  });
}
$$('[data-scatter]').forEach(scatterTitle);

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  $("#scrollThread").style.height = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  const threshold = $("#threshold");
  if (threshold.getBoundingClientRect().top < window.innerHeight * 0.55) threshold.classList.add("is-open");
}, { passive: true });

const dialog = $("#metricDialog");
const metricForm = $("#metricForm");

function buildField(field) {
  const label = document.createElement("label");
  label.className = "dialog-field";
  const title = document.createElement("span");
  title.textContent = field.label;
  label.appendChild(title);
  let control;
  if (field.type === "select") {
    control = document.createElement("select");
    field.options.forEach((text) => {
      const option = document.createElement("option");
      option.value = text;
      option.textContent = text;
      control.appendChild(option);
    });
  } else {
    control = document.createElement("input");
    control.type = field.type;
    control.placeholder = field.placeholder || "";
    if (field.type === "number") { control.min = "0"; control.max = "99"; control.inputMode = "numeric"; }
  }
  control.name = field.key;
  control.autocomplete = "off";
  control.value = state.metrics[field.key] || "";
  label.appendChild(control);
  return label;
}

function openMetric(key) {
  if (state.metrics[`done_${key}`]) return;
  state.activeMetric = key;
  const config = metricConfig[key];
  $("#dialogNumber").textContent = config.number;
  $("#dialogTitle").textContent = config.title;
  $("#dialogHint").textContent = config.hint;
  const fields = $("#dialogFields");
  fields.replaceChildren(...config.fields.map(buildField));
  dialog.showModal();
  requestAnimationFrame(() => $("input, select", fields)?.focus());
}

$$('.metric-bubble').forEach((bubble) => bubble.addEventListener("click", () => openMetric(bubble.dataset.metric)));
$(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

function splashBubble(bubble) {
  const fieldRect = $("#bubbleField").getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  const cx = bubbleRect.left - fieldRect.left + bubbleRect.width / 2;
  const cy = bubbleRect.top - fieldRect.top + bubbleRect.height / 2;
  for (let i = 0; i < 16; i += 1) {
    const drop = document.createElement("i");
    drop.className = "drop";
    drop.style.left = `${cx}px`;
    drop.style.top = `${cy}px`;
    const angle = (Math.PI * 2 * i) / 16;
    const distance = 55 + Math.random() * 70;
    drop.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    drop.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    $("#bubbleField").appendChild(drop);
    drop.addEventListener("animationend", () => drop.remove());
  }
  bubble.classList.add("popping");
  setTimeout(() => { bubble.hidden = true; }, 470);
}

const completedCount = () => Object.keys(metricConfig).filter((key) => state.metrics[`done_${key}`]).length;

metricForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const key = state.activeMetric;
  const config = metricConfig[key];
  const data = new FormData(metricForm);
  config.fields.forEach((field) => { state.metrics[field.key] = String(data.get(field.key) || "").trim(); });
  state.metrics[`done_${key}`] = true;
  dialog.close();
  splashBubble($(`.metric-bubble[data-metric="${key}"]`));
  const trail = $(`[data-slot="${key}"]`);
  trail.classList.add("done");
  $("b", trail).textContent = config.summary(state.metrics);
  const count = completedCount();
  $("#navCount").textContent = count;
  if (count === 5) $("#continueHand").disabled = false;
});

function systemLines() {
  return [
    ["GPA", metricConfig.gpa.summary(state.metrics)],
    ["RANK", metricConfig.rank.summary(state.metrics)],
    ["INTERNSHIPS", metricConfig.intern.summary(state.metrics)],
    ["AWARDS", metricConfig.award.summary(state.metrics)],
    ["SOCIAL", metricConfig.social.summary(state.metrics)]
  ];
}

$("#continueHand").addEventListener("click", () => {
  const output = $("#typedProfile");
  output.replaceChildren();
  systemLines().forEach(([label, value], index) => {
    const line = document.createElement("p");
    line.textContent = `> ${label.padEnd(14, " ")} ${value}`;
    line.style.opacity = "0";
    line.style.transform = "translateY(8px)";
    output.appendChild(line);
    setTimeout(() => { line.style.transition = "opacity .3s ease, transform .3s ease"; line.style.opacity = "1"; line.style.transform = "none"; }, index * 180 + 380);
  });
  $("#systemResult").scrollIntoView({ behavior: "smooth" });
});

const valueOr = (selector, fallback) => $(selector)?.value.trim() || fallback;
$("#humanWorld").addEventListener("submit", (event) => {
  event.preventDefault();
  state.human = {
    weather: $('input[name="weather"]:checked')?.value || "某一种天气",
    song: valueOr("#song", "一首还没写下名字的歌"),
    keep: valueOr("#keepDoing", "一件没有即时回报、仍愿意继续做的事"),
    friend: valueOr("#friendIntro", "一个无法被一行标签概括的人"),
    day: valueOr("#freeDay", "按照自己的节奏，认真度过一天")
  };
  $("#finalIntro").textContent = `我喜欢${state.human.weather}，最近循环《${state.human.song}》。这些偏好没有分值，却构成了我辨认生活的方式。`;
  $("#finalKeep").textContent = state.human.keep;
  $("#finalFriend").textContent = state.human.friend;
  $("#finalDay").textContent = state.human.day;
  $("#finalWorld").hidden = false;
  requestAnimationFrame(() => $("#finalWorld").scrollIntoView({ behavior: "smooth" }));
});

function portraitText() {
  return ["《数字之外的自我档案》", `我喜欢${state.human.weather}，最近循环《${state.human.song}》。`, `我愿意坚持：${state.human.keep}`, `朋友眼中的我：${state.human.friend}`, `无需证明的一天：${state.human.day}`, "", "系统无法计算你的价值。"].join("\n");
}

$("#copyPortrait").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(portraitText()); $("#actionMessage").textContent = "文字自画像已复制。"; }
  catch { $("#actionMessage").textContent = "当前浏览器无法自动复制，可以截屏保存。"; }
});

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  let line = ""; let row = 0;
  for (const char of [...text]) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight); line = char; row += 1;
      if (row >= maxLines) return y + row * lineHeight;
    } else line = test;
  }
  if (row < maxLines) ctx.fillText(line, x, y + row * lineHeight);
  return y + (row + 1) * lineHeight;
}

$("#savePortrait").addEventListener("click", () => {
  const canvas = $("#portraitCanvas"); const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#172231"); g.addColorStop(.48, "#253c58"); g.addColorStop(.5, "#e9f2f4"); g.addColorStop(1, "#fff3d9");
  ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.72)";
  for (let i = 0; i < 24; i += 1) { ctx.beginPath(); ctx.arc(80 + ((i * 157) % 1040), 70 + ((i * 211) % 1400), 2 + (i % 5), 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.stroke(); }
  ctx.fillStyle = "#ffffff"; ctx.font = "54px STKaiti, KaiTi, serif"; ctx.fillText("系统眼中的我", 76, 105);
  ctx.font = "20px monospace"; systemLines().forEach(([label, value], index) => ctx.fillText(`${label}  ${value}`, 80, 175 + index * 62));
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.moveTo(70, 520); ctx.lineTo(1130, 520); ctx.stroke();
  ctx.fillStyle = "#203349"; ctx.font = "62px STKaiti, KaiTi, serif"; ctx.fillText("数字之外的我", 76, 635);
  ctx.font = "34px STKaiti, KaiTi, serif"; let y = wrapText(ctx, `我喜欢${state.human.weather}，最近循环《${state.human.song}》。`, 76, 720, 1040, 50, 3);
  [["愿意坚持", state.human.keep], ["朋友眼中的我", state.human.friend], ["无需证明的一天", state.human.day]].forEach(([label, value]) => {
    y += 38; ctx.fillStyle = "#7c5161"; ctx.font = "22px sans-serif"; ctx.fillText(label, 76, y); y += 48;
    ctx.fillStyle = "#203349"; ctx.font = "30px STKaiti, KaiTi, serif"; y = wrapText(ctx, value, 76, y, 1040, 44, 3);
  });
  ctx.fillStyle = "#9b2f3f"; ctx.font = "52px STKaiti, KaiTi, serif"; ctx.fillText("系统无法计算你的价值。", 76, 1500);
  const link = document.createElement("a"); link.download = "我的两份自我档案.png"; link.href = canvas.toDataURL("image/png"); link.click();
  $("#actionMessage").textContent = "两份自我档案已经生成。";
});

$("#restart").addEventListener("click", () => {
  state.metrics = {}; state.human = {}; $("#humanWorld").reset();
  $$('.metric-bubble').forEach((bubble) => { bubble.hidden = false; bubble.classList.remove("popping"); });
  $$('.number-trail li').forEach((item) => { item.classList.remove("done"); $("b", item).textContent = "等待输入"; });
  $("#navCount").textContent = "0"; $("#continueHand").disabled = true; $("#finalWorld").hidden = true;
  $("#system").scrollIntoView({ behavior: "smooth" });
});

$("#videoPicker").addEventListener("change", (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  const video = $("#localVideo"); if (video.dataset.objectUrl) URL.revokeObjectURL(video.dataset.objectUrl);
  const url = URL.createObjectURL(file); video.dataset.objectUrl = url; video.src = url; video.hidden = false; $("#filmPlaceholder").hidden = true; video.play().catch(() => {});
});
