// 셀피 라운지(3D). 정적 파일로 도는 1인용 가게이고, 서버는 세 군데에서만 부른다:
// 측정 부스(/web/skin-test), 고민 게시판(/web/board), 익명 횟수(/web/stat).
// 사진·점수는 어디에도 저장하지 않는다. 브라우저에는 언어·자동 닉네임·내 글 삭제 토큰만 둔다.
// (로그인은 선택: api.cellfie.me 의 HttpOnly 쿠키라 이 페이지 스크립트는 읽을 수 없다.)
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API = (local && new URLSearchParams(location.search).get("api")) || "https://api.cellfie.me";
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const stat = (e) => { fetch(`${API}/web/stat?e=${e}`, { method: "POST" }).catch(() => {}); };

// ── 언어 ──
let lang = "ko";
const L = (ko, en) => (lang === "en" ? en : ko);
const eul = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? "을" : "를"); };
const ieyo = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? "이에요" : "예요"); };

// ── 지도: 한 칸 = 1m ──
// # 벽 · . 바닥 · D 출입문 · M 측정 부스 · T 테스터 · S 라운지 소파 · C 커피 테이블 · P 화분 · V 뷰티 TV · B 앱 책장 · L 성분 도서관
// 코너 선반: d 올리브영 랭킹 · r 아마존 스킨케어 · l 화해 랭킹 · g 올리브영 글로벌 · a 아마존 뷰티 · o 인생템
const MAP = [
  "#####################",
  "#ddddrrrlllgggaaaooo#",
  "#...................#",
  "#...................#",
  "#.......TTTTT.......#",
  "#...................#",
  "#...................#",
  "#L..................#",
  "#L..................#",
  "#...................#",
  "#...................#",
  "#.........MM..VV..P.#",
  "#S........MM........#",
  "#S.C................#",
  "#S.................B#",
  "#..................B#",
  "#...................#",
  "#########DDD#########",
];
const W = MAP[0].length, H = MAP.length;
const SOFA_Y = 12; // 소파 첫 칸(세 칸: 12·13·14)
const DOOR_X = 9; // 출입문 첫 칸(세 칸)
const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? MAP[y][x] : "#");

// 코너: 선반마다 랭킹 하나. 누르면 그 랭킹 페이지(항상 최신)로 바로 간다.
// 순위·상품명·가격은 옮겨 적지 않는다: 남의 랭킹을 복제하지 않고, 지난 가격이 남아 오해를 사지 않게.
const ZONES = {
  d: { key: "oliveyoung", name: ["올리브영 랭킹", "Olive Young Ranking"], color: "#6E8FB8",
    url: "https://www.oliveyoung.co.kr/store/main/getBestList.do" },
  r: { key: "amazon", name: ["아마존 스킨케어 베스트", "Amazon Skin Care Best Sellers"], color: "#B87B9A",
    url: "https://www.amazon.com/Best-Sellers-Beauty-Personal-Care-Skin-Care-Products/zgbs/beauty/11060451" },
  l: { key: "hwahae", name: ["화해 랭킹", "Hwahae Ranking"], color: "#7FA88E", url: "https://www.hwahae.co.kr/rankings" },
  g: { key: "oyglobal", name: ["올리브영 글로벌", "Olive Young Global"], color: "#C9A16B", url: "https://global.oliveyoung.com/display/page/best-seller" },
  a: { key: "amazonbeauty", name: ["아마존 뷰티 베스트", "Amazon Beauty Best Sellers"], color: "#9A8FC7", url: "https://www.amazon.com/Best-Sellers-Beauty-Personal-Care/zgbs/beauty" },
  o: { key: "favorite", name: ["인생템 코너", "All-time Favorites"], color: "#4FB3A5", url: null },
};
// 오늘의 질문: 코너마다 날짜로 하나씩 돌아간다(서버 없이 모두에게 같은 질문)
const QUESTIONS = {
  oliveyoung: [["올영에서 마지막으로 산 거 뭐예요?", "What did you last buy at Olive Young?"], ["올영 세일 때 꼭 쟁이는 템은?", "What do you always stock up on in an Olive Young sale?"], ["랭킹 1위 써 봤어요? 진짜 좋아요?", "Tried the #1? Is it really that good?"], ["올영픽 중에 실패한 거 있어요?", "Any Olive Young pick that didn't work for you?"], ["매장 테스터 써 보고 산 거 있어요?", "Bought something after trying the in-store tester?"], ["요즘 랭킹에서 제일 궁금한 제품은?", "Which ranked product are you most curious about?"], ["3만원으로 장바구니 채운다면?", "What would you buy with 30,000 won?"]],
  amazon: [["해외 직구로 산 스킨케어 중 최고는?", "Best skincare you've ordered from abroad?"], ["아마존 리뷰 믿고 샀다가 실패한 적?", "Ever trusted Amazon reviews and regretted it?"], ["미국 약국템 중 추천은?", "Which US drugstore pick do you recommend?"], ["여드름 패치 써 봤어요?", "Have you tried pimple patches?"], ["한국보다 싸게 산 템 있어요?", "Anything cheaper on Amazon than at home?"], ["세라비 vs 라로슈포제, 어느 쪽이에요?", "CeraVe or La Roche-Posay?"], ["직구 배송 얼마나 걸렸어요?", "How long did your overseas order take?"]],
  hwahae: [["성분 보고 거른 제품 있어요?", "Ever skipped a product because of its ingredients?"], ["랭킹 1위랑 내 피부 맞던가요?", "Did the #1 suit your skin?"], ["리뷰 보고 산 것 중 성공템은?", "A review-based buy that worked out?"], ["내 피부 타입 1위 제품 써 봤어요?", "Tried the #1 for your skin type?"], ["피하는 성분 있어요?", "Any ingredient you avoid?"], ["이 순위 의외다 싶은 제품?", "A surprising product in the ranking?"], ["랭킹 보고 바꾼 루틴 있어요?", "Changed your routine because of a ranking?"]],
  oyglobal: [["외국 친구한테 추천하는 K뷰티 템은?", "Which K-beauty item would you recommend to a friend abroad?"], ["해외에서 K뷰티 사 본 적 있어요?", "Have you bought K-beauty overseas?"], ["선물용으로 좋은 K뷰티는?", "Best K-beauty gift?"], ["K뷰티 첫 입문템은?", "Your first K-beauty product?"], ["해외 배송으로 받은 것 중 최고는?", "Best thing you got by international shipping?"], ["K뷰티 마스크팩 원픽은?", "Your one K-beauty sheet mask?"], ["여행 기념품으로 산 화장품은?", "Skincare you bought as a souvenir?"]],
  amazonbeauty: [["바디케어 추천템은?", "A body care pick you recommend?"], ["향 좋은 바디로션 아는 거?", "Know a body lotion that smells great?"], ["헤어템 중 인생템은?", "Your favorite hair product?"], ["가성비 최고 뷰티템은?", "Best value beauty product?"], ["선물 받고 좋았던 뷰티템?", "A beauty gift you loved?"], ["손 건조할 때 쓰는 템은?", "What do you use for dry hands?"], ["립밤 원픽은?", "Your go-to lip balm?"]],
  favorite: [["인생템 딱 하나만 꼽는다면?", "If you could keep only one product?"], ["몇 년째 쓰는 제품 있어요?", "Something you've used for years?"], ["다 쓰고 재구매한 템은?", "What have you repurchased?"], ["여행 갈 때 꼭 챙기는 템은?", "What always goes in your travel bag?"], ["누구한테나 추천하는 템은?", "What do you recommend to everyone?"], ["비싸도 안 아까운 템은?", "Pricey but worth it?"], ["싸고 좋은 숨은 명품은?", "Cheap but amazing?"]],
};
// 한국 날짜 기준으로 바뀐다(자정 KST)
const dayIndex = () => Math.floor((Date.now() + 9 * 3600000) / 86400000);
const todayQuestion = (key) => { const list = QUESTIONS[key]; return list[dayIndex() % list.length]; };
const zoneByKey = (k) => Object.keys(ZONES).find((z) => ZONES[z].key === k);
const AXES = [
  ["hydration", "수분", "Hydration"], ["oil", "유분", "Oil"], ["wrinkle", "주름", "Wrinkles"],
  ["tone", "피부톤", "Tone"], ["trouble", "트러블", "Breakouts"], ["pores", "모공", "Pores"],
  ["redness", "홍조", "Redness"], ["elasticity", "탄력", "Elasticity"],
];
const axisLabel = (k) => { const a = AXES.find((x) => x[0] === k); return a ? L(a[1], a[2]) : k; };

const zoneTiles = {};

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const z = at(x, y);
  if (!ZONES[z]) continue;
  (zoneTiles[z] = zoneTiles[z] || []).push([x, y]);
}

// ── 3D 장면 ──
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#EEE7DA");
scene.fog = new THREE.Fog("#EEE7DA", 20, 46);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

scene.add(new THREE.HemisphereLight("#FFF8EC", "#BFAE90", 1.15));
const sun = new THREE.DirectionalLight("#FFF1DC", 1.6);
sun.position.set(W / 2 + 4, 12, H / 2 + 6);
sun.target.position.set(W / 2, 0, H / 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 });
sun.shadow.bias = -0.0015;
sun.shadow.radius = 4;
scene.add(sun, sun.target);

const matCache = {};
const mat = (color, opts = {}) => {
  const k = color + JSON.stringify(opts);
  return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }));
};
const box = (w, h, d, color, r = 0.04) => {
  const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), mat(color));
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
const cx = (x) => x + 0.5, cz = (y) => y + 0.5;
const pickables = [];
const tagTile = (obj, x, y) => { obj.userData.tile = [x, y]; pickables.push(obj); return obj; };

function textTexture(draw, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FONT = (px, w = 700) => `${w} ${px}px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

// 바닥: 흰 테라조 타일(뷰티숍 매장 바닥)
{
  const tex = textTexture((g, w, h) => {
    g.fillStyle = "#F7F3EF"; g.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const chips = ["rgba(214,170,160,.55)", "rgba(190,190,186,.5)", "rgba(232,205,190,.6)", "rgba(160,150,150,.35)"];
    for (let i = 0; i < (w * h) / 900; i++) {
      g.fillStyle = chips[i % chips.length];
      const r = 1 + rnd() * 3.2;
      g.beginPath(); g.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(170,150,140,.22)"; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, (W - 2) * 64, (H - 2) * 64);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, H - 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, H / 2);
  floor.receiveShadow = true;
  floor.userData.floor = true;
  scene.add(floor);
  // 바깥 바닥(문 밖)
  const paving = textTexture((g, w, h) => {
    g.fillStyle = "#E3DCCF"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(150,135,115,.25)"; g.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let row = 0; row * 64 < h; row++) for (let x = (row % 2) * 64; x <= w; x += 128) { g.beginPath(); g.moveTo(x, row * 64); g.lineTo(x, row * 64 + 64); g.stroke(); }
  }, 256, 256);
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping; paving.repeat.set(60, 60);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: paving, roughness: 0.95 }));
  outside.rotation.x = -Math.PI / 2;
  outside.position.set(W / 2, -0.02, H / 2);
  outside.receiveShadow = true;
  scene.add(outside);
}

// 벽: 뒤와 양옆은 높게, 앞은 낮게(카메라가 안을 내려다보도록)
{
  const wallC = "#F4E4DF";
  const back = box(W, 2.8, 0.3, wallC, 0); back.position.set(W / 2, 1.4, 0.85); scene.add(back);
  const left = box(0.3, 2.8, H - 1, wallC, 0); left.position.set(0.85, 1.4, H / 2 - 0.5); scene.add(left);
  const right = box(0.3, 2.8, H - 1, wallC, 0); right.position.set(W - 0.85, 1.4, H / 2 - 0.5); scene.add(right);
  const base = mat("#FFFFFF");
  [[W / 2, 0.06, 1.02, W, 0.12, 0.05], [1.02, 0.06, H / 2 - 0.5, 0.05, 0.12, H - 1], [W - 1.02, 0.06, H / 2 - 0.5, 0.05, 0.12, H - 1]]
    .forEach(([x, y, z, w, h, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), base); m.position.set(x, y, z); scene.add(m); });
  const lenL = DOOR_X - 0.7, lenR = W - (DOOR_X + 3) - 0.7;
  const frontL = box(lenL, 0.4, 0.3, wallC, 0); frontL.position.set(0.7 + lenL / 2, 0.2, H - 0.85); scene.add(frontL);
  const frontR = box(lenR, 0.4, 0.3, wallC, 0); frontR.position.set(DOOR_X + 3 + lenR / 2, 0.2, H - 0.85); scene.add(frontR);
  // 출입문: 시야를 가리지 않게 문틀 없이 매트만 깐다
  const matt = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), mat("#7E8B72"));
  matt.rotation.x = -Math.PI / 2; matt.position.set(DOOR_X + 1.5, 0.006, H - 0.75); matt.receiveShadow = true; scene.add(matt);
  for (let x = DOOR_X; x <= DOOR_X + 2; x++) tagTile(matt, x, H - 1);
  // 웨인스코팅(아래 흰 판)과 금색 몰딩: 양옆 벽
  const wains = mat("#FFFFFF"), gold = new THREE.MeshStandardMaterial({ color: "#D8B37A", metalness: 0.6, roughness: 0.35 });
  [[1.01, Math.PI / 2], [W - 1.01, -Math.PI / 2]].forEach(([x, ry]) => {
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(H - 2, 1.0), wains); p2.rotation.y = ry; p2.position.set(x, 0.5, H / 2); scene.add(p2);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, H - 2), gold); rail.position.set(x, 1.02, H / 2); scene.add(rail);
  });
  // 뒤 벽 간판: 네온처럼 빛나는 흰 글씨
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({
    map: textTexture((g, w, h) => {
      g.font = FONT(120, 800); g.textAlign = "center"; g.textBaseline = "middle";
      g.shadowColor = "rgba(255,120,150,.9)"; g.shadowBlur = 28; g.fillStyle = "#FFF7F9";
      g.fillText("Cellfie", w / 2, h / 2 + 6); g.shadowBlur = 12; g.fillText("Cellfie", w / 2, h / 2 + 6);
    }, 680, 170), transparent: true }));
  sign.position.set(W / 2, 2.4, 1.01);
  scene.add(sign);
}

// 선반: 앞을 +z 로 만들고 돌린다
const productGeo = new THREE.BoxGeometry(0.13, 1, 0.13);
const bottleGeo = new THREE.CylinderGeometry(0.06, 0.07, 1, 12);
function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return "#" + c.getHexString();
}
const jarGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 16);
const ledMat = new THREE.MeshBasicMaterial({ color: "#FFF4E6" });
function makeShelf(x, y, z) {
  const g = new THREE.Group();
  const color = ZONES[z].color;
  const white = "#FFFFFF";
  // 속이 빈 흰 틀: 뒤판(연한 구역색)·양옆·지붕·받침
  [[1.0, 1.7, 0.04, 0, 0.85, -0.26, shade(color, 0.32)], [0.04, 1.7, 0.56, -0.48, 0.85, 0, white], [0.04, 1.7, 0.56, 0.48, 0.85, 0, white],
    [1.0, 0.06, 0.58, 0, 1.7, 0, white], [1.0, 0.14, 0.58, 0, 0.07, 0, white]].forEach(([w, h, dd, px, py, pz, c]) => {
    const m = box(w, h, dd, c, 0.01); m.position.set(px, py, pz); g.add(m);
  });
  for (let lv = 0; lv < 3; lv++) {
    const yy = 0.36 + lv * 0.46;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.03, 0.5), mat("#FFFFFF")); plank.position.set(0, yy, 0.02); plank.receiveShadow = true; g.add(plank);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.02), ledMat); led.position.set(0, yy + 0.43, 0.24); g.add(led);
    // 같은 높이·같은 간격으로 가지런히, 칸마다 병·튜브·크림 통 중 하나로 맞춘다
    const kind = (x + lv) % 3;
    const hgt = kind === 0 ? 0.26 : kind === 1 ? 0.22 : 0.12;
    for (let k = 0; k < 5; k++) {
      const geo = kind === 0 ? bottleGeo : kind === 1 ? productGeo : jarGeo;
      const m = new THREE.Mesh(geo, mat(shade(color, (k % 2 ? 0.12 : 0.02) + (lv === 1 ? 0.06 : 0))));
      m.scale.y = hgt;
      m.position.set(-0.34 + k * 0.17, yy + 0.015 + hgt / 2, 0.06);
      m.castShadow = true;
      g.add(m);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(kind === 2 ? 0.078 : 0.032, kind === 2 ? 0.078 : 0.032, 0.04, 12), mat(kind === 2 ? "#F2F2F2" : "#D8B37A"));
      cap.position.set(m.position.x, yy + 0.015 + hgt + 0.02, 0.06); g.add(cap);
    }
  }
  // 자리: 뒤 벽 진열장은 벽에 붙인다(옆 벽 기둥 선반은 더 이상 없다)
  if (y === 1) g.position.set(cx(x), 0, cz(y) - 0.18);
  else if (x === 1) { g.rotation.y = Math.PI / 2; g.position.set(cx(x) - 0.18, 0, cz(y)); }
  else if (x === W - 2) { g.rotation.y = -Math.PI / 2; g.position.set(cx(x) + 0.18, 0, cz(y)); }
  else g.position.set(cx(x), 0, cz(y));
  g.traverse((o) => { if (o.isMesh) o.userData.tile = [x, y]; });
  pickables.push(g);
  scene.add(g);
}
Object.entries(zoneTiles).forEach(([z, tiles]) => tiles.forEach(([x, y]) => makeShelf(x, y, z)));

// 구역 표지판(이야기 수 포함). 이야기 수가 들어오면 다시 그린다.
const boardCounts = {};
const signs = {};
function drawSign(z) {
  const zone = ZONES[z];
  const n = boardCounts[zone.key];
  const tiles = zoneTiles[z];
  const xs = tiles.map((t) => t[0]);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const tex = textTexture((g, w, h) => {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, w, h);
    g.fillStyle = zone.color; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = zone.color; g.beginPath(); g.arc(34, h / 2 - 4, 11, 0, 7); g.fill();
    g.fillStyle = "#3B3340"; g.textAlign = "left"; g.textBaseline = "middle";
    const label = L(zone.name[0], zone.name[1]);
    let px = 52;
    do { g.font = FONT(px, 800); px -= 2; } while (g.measureText(label).width > w - (n ? 150 : 80) && px > 20);
    g.fillText(label, 56, h / 2 - 4);
    if (n) { g.font = FONT(28, 700); g.fillStyle = "#8A7F86"; g.textAlign = "right"; g.fillText(L(`💬 ${n}`, `💬 ${n}`), w - 18, h / 2 - 4); }
  }, 256 * width, 96);
  if (signs[z]) { signs[z].material.map.dispose(); signs[z].material.map = tex; signs[z].material.needsUpdate = true; return; }
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.04, 0.42), new THREE.MeshBasicMaterial({ map: tex }));
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5;
  s2.position.set(mx, 1.98, cz(tiles[0][1]) - 0.18 + 0.3);
  tiles.forEach(([tx, ty]) => { s2.userData.tile = [tx, ty]; });
  pickables.push(s2);
  signs[z] = s2;
  scene.add(s2);
}
Object.keys(zoneTiles).forEach(drawSign);

// 뷰티 바: 흰 카운터, 금색 테두리, 둥근 거울. 누르면 전면 카메라 거울
{
  const t = box(4.8, 0.86, 0.8, "#FBF8F6", 0.05); t.position.set(10.5, 0.43, 4.5); scene.add(t);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(4.84, 0.03, 0.84), new THREE.MeshStandardMaterial({ color: "#D8B37A", metalness: 0.6, roughness: 0.35 })); edge.position.set(10.5, 0.875, 4.5); scene.add(edge);
  const mirrorMat = new THREE.MeshBasicMaterial({ map: textTexture((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(0.5, "#E7EDF2"); gr.addColorStop(1, "#F6F1F4");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 10; g.beginPath(); g.moveTo(w * 0.25, h * 0.7); g.lineTo(w * 0.6, h * 0.3); g.stroke();
  }, 128, 128) });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#D8B37A", metalness: 0.6, roughness: 0.35 });
  [8.9, 10.5, 12.1].forEach((x) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), mirrorMat); m.position.set(x, 1.22, 4.3); scene.add(m);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 40), rimMat); rim.position.copy(m.position); scene.add(rim);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.12, 10), rimMat); stem.position.set(x, 0.94, 4.3); scene.add(stem);
  });
  const cols = ["#E8A0B4", "#F2C6A0", "#B9D8C7", "#C7B9E3", "#F4D58D"];
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(bottleGeo, mat(cols[i % cols.length]));
    const h = 0.16 + (i % 2) * 0.04;
    b.scale.y = h; b.position.set(8.4 + i * 0.47, 0.89 + h / 2, 4.62); b.castShadow = true; scene.add(b);
  }
  for (let x = 8; x <= 12; x++) tagTile(t, x, 4);
  t.userData.tile = [10, 4];
  // 가운데 큰 원형 러그로 매장 바닥을 하나로 묶는다
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), mat("#F6E3E0"));
  rug.rotation.x = -Math.PI / 2; rug.position.set(10.5, 0.004, 7.8); rug.receiveShadow = true; scene.add(rug);
}

// 라운지: 소파에 앉아 쉬는 자리(산사의 방석 같은 곳)
{
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 40), mat("#EFD9CF"));
  rug.rotation.x = -Math.PI / 2; rug.position.set(2.6, 0.006, SOFA_Y + 1.5); rug.receiveShadow = true; scene.add(rug);
  const sofaBase = box(0.9, 0.42, 3, "#E7C9C1", 0.12); sofaBase.position.set(1.55, 0.21, SOFA_Y + 1.5); scene.add(sofaBase);
  const sofaBack = box(0.28, 0.6, 3, "#DDB7AE", 0.12); sofaBack.position.set(1.18, 0.62, SOFA_Y + 1.5); scene.add(sofaBack);
  [SOFA_Y + 0.15, SOFA_Y + 2.85].forEach((z) => { const arm = box(0.9, 0.55, 0.26, "#DDB7AE", 0.1); arm.position.set(1.55, 0.36, z); scene.add(arm); });
  [SOFA_Y + 0.55, SOFA_Y + 1.5, SOFA_Y + 2.45].forEach((z, i) => { const c = box(0.62, 0.14, 0.82, ["#F2C14E", "#F3E9DA", "#E57A9C"][i], 0.06); c.position.set(1.6, 0.48, z); scene.add(c); });
  for (let y = SOFA_Y; y <= SOFA_Y + 2; y++) { const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(1.5, 0.5, cz(y)); tagTile(hit, 1, y); scene.add(hit); }
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 28), mat("#C99B6D")); table.position.set(cx(3), 0.45, cz(SOFA_Y + 1)); table.castShadow = true; scene.add(table);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.42, 12), mat("#A57A52")); leg.position.set(cx(3), 0.21, cz(SOFA_Y + 1)); scene.add(leg);
  tagTile(table, 3, SOFA_Y + 1);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 16), mat("#FFFFFF")); cup.position.set(cx(3) + 0.12, 0.55, cz(SOFA_Y + 1)); scene.add(cup);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), mat("#6B4A33")); coffee.rotation.x = -Math.PI / 2; coffee.position.set(cx(3) + 0.12, 0.617, cz(SOFA_Y + 1)); scene.add(coffee);
  const bookA = box(0.28, 0.05, 0.2, "#5FA8DC", 0.01); bookA.position.set(cx(3) - 0.12, 0.505, cz(SOFA_Y + 1) - 0.05); scene.add(bookA);
  // 스탠드 조명(따뜻한 빛)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), mat("#3B3B3B")); pole.position.set(1.4, 0.85, SOFA_Y - 0.6); scene.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#FFE7B8", emissive: "#FFC870", emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  shade.position.set(1.4, 1.75, SOFA_Y - 0.6); scene.add(shade);
  const warm = new THREE.PointLight("#FFC27A", 3.2, 5, 1.6); warm.position.set(1.6, 1.6, SOFA_Y + 0.2); scene.add(warm);
}

// 창문: 양옆 벽 위쪽으로 하늘이 보인다
{
  const sky = textTexture((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#8EC9F0"); gr.addColorStop(0.7, "#CFE9F7"); gr.addColorStop(1, "#F7E6C8");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,.9)";
    [[60, 50, 26], [90, 44, 32], [120, 52, 24], [300, 80, 22], [328, 72, 28], [356, 82, 20]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    g.fillStyle = "#7DB36A";
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(20 + i * 50, h - 6, 34 + (i % 3) * 8, Math.PI, 0); g.fill(); }
    g.strokeStyle = "#FFFFFF"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  }, 420, 220);
  const winMat = new THREE.MeshBasicMaterial({ map: sky });
  [[1.01, 4, Math.PI / 2], [1.01, 10.5, Math.PI / 2], [W - 1.01, 4, -Math.PI / 2], [W - 1.01, 8.5, -Math.PI / 2], [W - 1.01, 12.5, -Math.PI / 2]].forEach(([x, z, ry]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.1), winMat);
    w.position.set(x, 2.15, z); w.rotation.y = ry; scene.add(w);
  });
}

// 측정 부스(2×2): 입구 바로 앞 가운데
const BX = 11, BZ = 12;
let scanLine = null;
{
  const b = box(1.86, 2.3, 1.86, "#F5F7F3", 0.14); b.position.set(BX, 1.15, BZ);
  b.traverse((o) => { o.userData.tile = [10, 11]; });
  pickables.push(b); scene.add(b);
  const stripe = box(1.88, 0.14, 1.88, "#88B04B", 0.05); stripe.position.set(BX, 0.3, BZ); scene.add(stripe);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshBasicMaterial({
    map: textTexture((g, w, h) => {
      g.fillStyle = "#1E2B36"; g.beginPath(); g.roundRect(0, 0, w, h, 30); g.fill();
      g.strokeStyle = "#7BE08A"; g.lineWidth = 8; g.setLineDash([18, 12]);
      g.beginPath(); g.ellipse(w / 2, h / 2 - 20, 70, 92, 0, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]); g.fillStyle = "#7BE08A"; g.fillRect(70, h / 2 - 22, w - 140, 5);
      g.font = FONT(34, 800); g.textAlign = "center"; g.fillText("SKIN SCAN", w / 2, h - 34);
    }, 360, 300) }));
  screen.position.set(BX, 1.42, BZ + 0.94);
  screen.userData.tile = [10, 11];
  // 화면 위를 오르내리는 스캔선
  scanLine = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.03), new THREE.MeshBasicMaterial({ color: "#7BE08A", transparent: true, opacity: 0.9 }));
  scanLine.position.set(BX, 1.42, BZ + 0.95);
  scene.add(scanLine);
  pickables.push(screen);
  scene.add(screen);
}

// 뷰티 TV: 입구 바로 앞, SKIN SCAN 부스 오른쪽. 화면에 유튜버 이름이 돌아가며 나온다
const TV = { x: 15, z: 11.6, tex: null, i: 0 };
{
  const stand = box(1.9, 0.5, 0.5, "#FFFFFF", 0.04); stand.position.set(TV.x, 0.25, TV.z + 0.05); scene.add(stand);
  const frame = box(1.85, 1.1, 0.08, "#1F2326", 0.03); frame.position.set(TV.x, 1.45, TV.z - 0.12); scene.add(frame);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.97), new THREE.MeshBasicMaterial({ color: "#FFFFFF" }));
  scr.position.set(TV.x, 1.45, TV.z - 0.075); scene.add(scr);
  TV.screen = scr;
  [stand, frame, scr].forEach((m) => { tagTile(m, 14, 11); m.userData.tile = [14, 11]; });
}
// 앱 책장: 오른쪽 벽 아래. 앱 상자 두 개와 책
{
  const bx = W - 1.62, bz = 15;
  // 속이 빈 틀(통짜 상자면 책이 안에 묻힌다): 양옆·지붕·받침
  [[0.5, 1.9, 0.05, bx + 0.05, 0.95, bz - 0.93], [0.5, 1.9, 0.05, bx + 0.05, 0.95, bz + 0.93], [0.5, 0.05, 1.9, bx + 0.05, 1.9, bz], [0.5, 0.1, 1.9, bx + 0.05, 0.05, bz]]
    .forEach(([w, h, dd, x, y, z]) => { const m = box(w, h, dd, "#FFFFFF", 0.01); m.position.set(x, y, z); scene.add(m); });
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.7, 1.75), mat("#F2DCD6")); back.position.set(bx + 0.28, 1.0, bz); scene.add(back);
  const cols = ["#E25D4F", "#5FA8DC", "#F2C14E", "#88B04B", "#9A7FD1", "#F08A5D", "#4FB3A5"];
  for (let lv = 0; lv < 3; lv++) {
    const y = 0.25 + lv * 0.55;
    const plankM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 1.8), mat("#FFFFFF")); plankM.position.set(bx, y, bz); scene.add(plankM);
    if (lv === 1) continue;
    for (let k = 0; k < 9; k++) {
      const hgt = 0.3 + ((k * 7 + lv) % 4) * 0.04;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.3, hgt, 0.12), mat(cols[(k + lv * 3) % cols.length]));
      book.position.set(bx - 0.02, y + hgt / 2 + 0.02, bz - 0.8 + k * 0.19); book.castShadow = true; scene.add(book);
    }
  }
  // 가운데 칸: 앱 상자(앱 아이콘 대신 Cellfie 로고 판)
  const logo = textTexture((g, w, h) => {
    g.fillStyle = "#88B04B"; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
    g.fillStyle = "#fff"; g.font = FONT(64, 800); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Cellfie", w / 2, h / 2 - 18);
    g.font = FONT(30, 700); g.fillText("APP", w / 2, h / 2 + 40);
  }, 256, 256);
  [bz - 0.4, bz + 0.4].forEach((z) => {
    const app = box(0.24, 0.42, 0.42, "#FFFFFF", 0.06); app.position.set(bx - 0.02, 0.25 + 0.55 + 0.23, z); scene.add(app);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshBasicMaterial({ map: logo })); face.rotation.y = -Math.PI / 2; face.position.set(bx - 0.15, 1.03, z); scene.add(face);
  });
  for (let y = 14; y <= 15; y++) { const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(cx(W - 2), 1, cz(y)); tagTile(hit, W - 2, y); scene.add(hit); }
}

// 성분 도서관 책장: 왼쪽 벽 가운데. 고민별 성분과 논문
let libPlate = null;
function paintLibPlate() {
  if (!libPlate) return;
  if (libPlate.material.map) libPlate.material.map.dispose();
  libPlate.material.map = textTexture((g, w, h) => {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, w, h); g.fillStyle = "#9A7FD1"; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = "#3B3340"; g.font = FONT(46, 800); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(L("📚 성분 도서관", "📚 Ingredient Library"), w / 2, h / 2 - 4);
  }, 512, 108);
  libPlate.material.needsUpdate = true;
}
{
  const bx = 1.62, bz = 8;
  [[0.5, 1.9, 0.05, bx - 0.05, 0.95, bz - 0.93], [0.5, 1.9, 0.05, bx - 0.05, 0.95, bz + 0.93], [0.5, 0.05, 1.9, bx - 0.05, 1.9, bz], [0.5, 0.1, 1.9, bx - 0.05, 0.05, bz]]
    .forEach(([w, h, dd, x, y, z]) => { const m = box(w, h, dd, "#FFFFFF", 0.01); m.position.set(x, y, z); scene.add(m); });
  const backL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.7, 1.75), mat("#E9E2F2")); backL.position.set(bx - 0.28, 1.0, bz); scene.add(backL);
  const cols = ["#C7B9E3", "#B9D8C7", "#F2C6A0", "#E8A0B4", "#A9C8E8", "#F4D58D"];
  for (let lv = 0; lv < 3; lv++) {
    const y = 0.25 + lv * 0.55;
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 1.8), mat("#FFFFFF")); pl.position.set(bx, y, bz); scene.add(pl);
    for (let k = 0; k < 10; k++) {
      const hgt = 0.32 + ((k * 5 + lv) % 3) * 0.05;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.3, hgt, 0.13), mat(cols[(k + lv * 2) % cols.length]));
      book.position.set(bx + 0.02, y + hgt / 2 + 0.02, bz - 0.81 + k * 0.18); book.castShadow = true; scene.add(book);
    }
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.36), new THREE.MeshBasicMaterial());
  libPlate = plate;
  paintLibPlate();
  plate.rotation.y = Math.PI / 2; plate.position.set(bx + 0.24, 2.05, bz); scene.add(plate);
  for (let y = 7; y <= 8; y++) { const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(cx(1), 1.1, cz(y)); tagTile(hit, 1, y); scene.add(hit); }
  tagTile(plate, 1, 7);
}

// 매장 바깥: 잔디밭과 나무, 가로등, 벤치. 매장이 빈 공간에 뜬 상자처럼 보이지 않게
{
  const grass = mat("#CFDDB4"), trunk = mat("#9C7A5B"), leafs = ["#8DB36A", "#7FA85E", "#A3C27F"];
  const lawn = (x, z, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), grass); m.rotation.x = -Math.PI / 2; m.position.set(x, -0.01, z); m.receiveShadow = true; scene.add(m); };
  const tree = (x, z, sc) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * sc, 0.14 * sc, 1.2 * sc, 8), trunk); t.position.set(x, 0.6 * sc, z); t.castShadow = true; scene.add(t);
    [[0, 1.55, 0, 0.75], [0.35, 1.3, 0.2, 0.55], [-0.32, 1.35, -0.15, 0.55], [0.05, 1.95, -0.05, 0.5]].forEach(([dx, dy, dz, r], i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(r * sc, 16, 12), mat(leafs[i % leafs.length])); l.position.set(x + dx * sc, dy * sc, z + dz * sc); l.castShadow = true; scene.add(l);
    });
  };
  // 왼쪽·오른쪽 잔디 띠
  [[-2.6, 3], [-2.8, 9], [-2.4, 15], [W + 2.6, 2.5], [W + 2.8, 8.5], [W + 2.4, 14.5]].forEach(([x, z], i) => { lawn(x, z, 2.4); tree(x, z, 1 + (i % 3) * 0.18); });
  // 뒤쪽 나무 줄
  for (let i = 0; i < 8; i++) { const x = 0.5 + i * 2.9; lawn(x, -2.6, 2.0); tree(x, -2.6, 1.15 + (i % 2) * 0.2); }
  // 앞쪽 모서리 나무 둘(가운데 입구는 비운다)
  [[-1.8, H + 1.6], [W + 1.8, H + 1.6]].forEach(([x, z]) => { lawn(x, z, 1.8); tree(x, z, 0.95); });
  // 가로등 둘: 앞 모서리 바깥(카메라와 매장 사이를 가리지 않게)
  [[-0.9, H - 0.6], [W + 0.9, H - 0.6]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 10), mat("#3D3A36")); pole.position.set(x, 1.2, z); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: "#FFF4D6", emissive: "#FFE3A0", emissiveIntensity: 0.8 })); bulb.position.set(x, 2.45, z); scene.add(bulb);
  });
}
// 벽 윗면 마감선: 잘린 단면 대신 흰 몰딩
{
  const cap = mat("#FFFFFF");
  [[W / 2, 2.82, 0.85, W + 0.1, 0.06, 0.36], [0.85, 2.82, H / 2 - 0.5, 0.36, 0.06, H - 0.9], [W - 0.85, 2.82, H / 2 - 0.5, 0.36, 0.06, H - 0.9]]
    .forEach(([x, y, z, w, h, dd]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), cap); m.position.set(x, y, z); scene.add(m); });
}

// 화분
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === "P") {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.4, 16), mat("#C77B57")); pot.position.set(cx(x), 0.2, cz(y)); pot.castShadow = true;
  scene.add(pot); tagTile(pot, x, y);
  [[0, 0.75, 0, 0.3], [0.18, 0.6, 0.1, 0.22], [-0.17, 0.62, -0.06, 0.22], [0.02, 0.98, 0.05, 0.2]].forEach(([dx, dy, dz, r]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat("#5E9A48")); leaf.position.set(cx(x) + dx, dy, cz(y) + dz); leaf.castShadow = true; scene.add(leaf); tagTile(leaf, x, y);
  });
}

const flags = [];
// 유튜버 채널(2026-11-08 확인한 채널 주소). 이름·링크만 쓰고 썸네일·로고는 쓰지 않는다.
const CREATORS = {
  ko: [
    ["이사배 RISABAE", "메이크업", "https://www.youtube.com/@RISABAE"],
    ["회사원A", "뷰티 리뷰", "https://www.youtube.com/@calarygirl"],
    ["디렉터파이", "뷰티 리뷰", "https://www.youtube.com/@director_pihyunjung"],
    ["LeoJ Makeup", "메이크업", "https://www.youtube.com/@LeoJMakeup"],
    ["홍이모", "메이크업", "https://www.youtube.com/@hongsmakeup"],
    ["박경열의 피부상담소", "피부 상담", "https://www.youtube.com/@%EB%B0%95%EA%B2%BD%EC%97%B4%EC%9D%98%ED%94%BC%EB%B6%80%EC%83%81%EB%8B%B4%EC%86%8C"],
  ],
  en: [
    ["Hyram", "Skincare", "https://www.youtube.com/@Hyram"],
    ["James Welsh", "Skincare", "https://www.youtube.com/@JamesWelsh"],
    ["Dr Dray", "Dermatologist", "https://www.youtube.com/@DrDrayzday"],
    ["Cassandra Bankson", "Skincare", "https://www.youtube.com/@CassandraBankson"],
    ["Mixed Makeup (Susan Yara)", "Skincare", "https://www.youtube.com/@Mixedmakeup"],
  ],
};
const APP_LINKS = {
  play: "https://play.google.com/store/apps/details?id=cellfie.app",
  // iOS 앱은 한국 App Store 에만 있다(2026-11-08 확인: kr 200, us 404)
  apple: "https://apps.apple.com/kr/app/id6806944015",
};
function paintTV() {
  const all = [...CREATORS.ko, ...CREATORS.en];
  const c = all[TV.i % all.length];
  TV.i++;
  const tex = textTexture((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#2B2F4A"); gr.addColorStop(1, "#5B3A5E");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#FF4E45"; g.beginPath(); g.roundRect(30, 30, 150, 52, 14); g.fill();
    g.fillStyle = "#fff"; g.font = FONT(30, 800); g.textBaseline = "middle"; g.fillText("BEAUTY TV", 44, 57);
    g.beginPath(); g.moveTo(w / 2 - 34, h / 2 - 44); g.lineTo(w / 2 - 34, h / 2 + 44); g.lineTo(w / 2 + 44, h / 2); g.fill();
    g.font = FONT(40, 800); g.textAlign = "center"; g.fillText(c[0], w / 2, h - 82);
    g.font = FONT(26, 600); g.fillStyle = "rgba(255,255,255,.75)"; g.fillText(L("눌러서 채널 보기", "Tap to browse channels"), w / 2, h - 40);
  }, 640, 360);
  if (TV.screen.material.map) TV.screen.material.map.dispose();
  TV.screen.material.map = tex; TV.screen.material.needsUpdate = true;
}
paintTV();
setInterval(paintTV, 3500);

// ── 사람(귀엽고 사람스럽게: 큰 머리, 짧은 몸) ──
const PALS = {
  me: { hair: "#3B2A20", skin: "#F5D3B8", cloth: "#88B04B", pants: "#3E4A5E" },
  staff: { hair: "#22262C", skin: "#F2CFAF", cloth: "#2F6F45", pants: "#2A2A2A", apron: true },
  staff2: { hair: "#7A4B2A", skin: "#F6D6BE", cloth: "#2F6F45", pants: "#2A2A2A", apron: true },
  s1: { hair: "#C27C3A", skin: "#F3D0B2", cloth: "#E57A9C", pants: "#3B3B55" },
  s2: { hair: "#111111", skin: "#E9C4A2", cloth: "#5FA8DC", pants: "#4A3B2E" },
  s3: { hair: "#8A8A8A", skin: "#F0CDB0", cloth: "#EEB64A", pants: "#2E3B2E" },
  s4: { hair: "#5A3825", skin: "#F4D2B6", cloth: "#9A7FD1", pants: "#2F3550" },
  s5: { hair: "#D9A441", skin: "#F7DCC6", cloth: "#4FB3A5", pants: "#3E3A36" },
  s6: { hair: "#2B1E18", skin: "#E6BF9C", cloth: "#F08A5D", pants: "#33404A" },
  s7: { hair: "#6B2E3A", skin: "#F3D0B2", cloth: "#F2F2F2", pants: "#4A5B70" },
};
// 꾸미기: look = "h{머리}c{옷}a{소품}" (예: h2c4a1)
const HAIRS = ["#3B2A20", "#111111", "#7A4B2A", "#C27C3A", "#D9A441", "#8A8A8A", "#6B2E3A", "#E8A6B8"];
const CLOTHS = ["#88B04B", "#5FA8DC", "#E57A9C", "#EEB64A", "#9A7FD1", "#4FB3A5", "#F08A5D", "#F2F2F2"];
const ACCS = [["없음", "None"], ["머리띠", "Headband"], ["비니", "Beanie"], ["헤어핀", "Hair pin"]];
const parseLook = (look) => {
  const m = /^h(\d)c(\d)a(\d)$/.exec(look || "");
  const h = m ? Math.min(+m[1], HAIRS.length - 1) : 0, c = m ? Math.min(+m[2], CLOTHS.length - 1) : 0, a = m ? Math.min(+m[3], ACCS.length - 1) : 0;
  return { h, c, a };
};
const lookPalette = (look) => { const { h, c, a } = parseLook(look); return { hair: HAIRS[h], skin: "#F5D3B8", cloth: CLOTHS[c], pants: "#3E4A5E", acc: a }; };
function makePerson(palName) {
  const p = typeof palName === "string" ? PALS[palName] : palName;
  const g = new THREE.Group();
  const part = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const legGeo = new THREE.CapsuleGeometry(0.06, 0.14, 4, 8);
  const legs = [part(legGeo, p.pants, -0.075, 0.14, 0), part(legGeo, p.pants, 0.075, 0.14, 0)];
  legs.forEach((l) => { l.geometry = legGeo; });
  part(new THREE.CapsuleGeometry(0.16, 0.2, 6, 16), p.cloth, 0, 0.44, 0);
  if (p.apron) part(new THREE.BoxGeometry(0.22, 0.26, 0.02), "#F4F1E6", 0, 0.42, 0.165);
  const armGeo = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8);
  const arms = [part(armGeo, p.cloth, -0.21, 0.45, 0), part(armGeo, p.cloth, 0.21, 0.45, 0)];
  part(new THREE.SphereGeometry(0.22, 24, 18), p.skin, 0, 0.84, 0);
  const hair = part(new THREE.SphereGeometry(0.235, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), p.hair, 0, 0.86, -0.015);
  hair.rotation.x = -0.45;
  const eyeGeo = new THREE.SphereGeometry(0.026, 10, 8);
  part(eyeGeo, "#1B1B1B", -0.075, 0.83, 0.2); part(eyeGeo, "#1B1B1B", 0.075, 0.83, 0.2);
  const cheekGeo = new THREE.SphereGeometry(0.035, 10, 8);
  [-0.12, 0.12].forEach((x) => { const c = part(cheekGeo, "#F2A3A0", x, 0.78, 0.17); c.scale.z = 0.4; c.castShadow = false; });
  // 소품
  if (p.acc === 1) { const band = part(new THREE.TorusGeometry(0.2, 0.025, 8, 24, Math.PI), "#E25D4F", 0, 0.95, 0.02); band.rotation.set(-0.35, 0, 0); band.scale.set(1.15, 1, 1); }
  if (p.acc === 2) { const hat = part(new THREE.SphereGeometry(0.245, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), "#E9B53A", 0, 0.9, -0.02); hat.rotation.x = -0.25; part(new THREE.SphereGeometry(0.05, 10, 8), "#FFFFFF", 0, 1.15, -0.05); }
  if (p.acc === 3) part(new THREE.SphereGeometry(0.045, 10, 8), "#F2C14E", 0.16, 0.98, 0.1);
  // 마스크팩(밤 10시 마스크팩 타임에 쓴다): 얼굴 앞에 흰 시트
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.205, 20, 14, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.28, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.6, side: THREE.DoubleSide }));
  mask.position.set(0, 0.84, 0.025); mask.rotation.y = 0; mask.visible = false; g.add(mask);
  g.userData.legs = legs; g.userData.arms = arms; g.userData.mask = mask;
  scene.add(g);
  return g;
}
function setMesh(a, pal) {
  const old = a.mesh;
  if (old) { scene.remove(old); const i = pickables.indexOf(old); if (i >= 0) pickables.splice(i, 1); }
  a.mesh = makePerson(pal);
  a.mesh.traverse((o) => { o.userData.actor = a; });
  if (old) { a.mesh.position.copy(old.position); a.mesh.rotation.copy(old.rotation); }
  pickables.push(a.mesh);
}

// ── 행동 주체 ──
const mkActor = (x, y, pal, extra) => {
  const a = Object.assign({ x, y, ox: x, oy: y, t: 1, dir: "down", yaw: 0, pal, walk: 0 }, extra);
  setMesh(a, pal);
  return a;
};
// 내 꾸미기는 이 브라우저에 둔다(처음엔 무작위)
let myLook = store.get("cellfie-store-look");
if (!/^h\dc\da\d$/.test(myLook || "")) { myLook = `h${Math.floor(Math.random() * 8)}c${Math.floor(Math.random() * 8)}a${Math.floor(Math.random() * 4)}`; store.set("cellfie-store-look", myLook); }
const me = mkActor(10, 16, lookPalette(myLook), { dir: "up", path: [], goal: null });
me.yaw = Math.PI;
const npcs = [
  mkActor(12, 12, "staff2", { kind: "booth", dir: "down", name: ["측정 매니저", "Booth staff"] }),
  mkActor(5, 6, "s1", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["인생템 코너에 붙은 메모 보고 하나 샀어요.", "I bought something after reading the favorites board."],
    ["뷰티 바 테스터 다 발라 봤더니 손등이 반짝반짝해요.", "I tried every tester at the beauty bar."]] }),
  mkActor(14, 3, "s2", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["SKIN SCAN 해 봤어요? 저는 생각보다 어리게 나왔어요.", "Tried SKIN SCAN? Mine came out younger than I thought."],
    ["진열장 간판 누르면 랭킹이 바로 열려요.", "Tap a shelf sign and the ranking opens right away."]] }),
  mkActor(16, 8, "s4", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["TV 에 나오는 유튜버 채널 눌러 보면 바로 가져요.", "Tap the TV to jump to the YouTubers."]] }),
];
npcs.forEach((n) => { n.x0 = n.x; n.y0 = n.y; n.yaw = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 }[n.dir]; });
const occupied = (x, y, except) => (me !== except && me.x === x && me.y === y)
  || npcs.some((n) => n !== except && ((n.x === x && n.y === y) || (n.t < 1 && n.ox === x && n.oy === y)));
const walkable = (x, y, who) => at(x, y) === "." && !occupied(x, y, who);

// ── 길 찾기 ──
const neighbors = (x, y) => [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]];
const dirTo = (fx, fy, tx, ty) => (tx > fx ? "right" : tx < fx ? "left" : ty > fy ? "down" : "up");
const group = (x, y) => {
  if (at(x, y) !== "M") return [[x, y]];
  const out = [];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (at(xx, yy) === "M") out.push([xx, yy]);
  return out;
};
const adjacentPart = (x, y) => group(x, y).find(([gx, gy]) => Math.abs(gx - me.x) + Math.abs(gy - me.y) === 1) || null;
function findPath(sx, sy, goals) {
  const key = (x, y) => x + "," + y;
  const goalSet = new Set(goals.map(([x, y]) => key(x, y)));
  if (goalSet.has(key(sx, sy))) return [];
  const prev = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of neighbors(x, y)) {
      const k = key(nx, ny);
      if (prev.has(k) || !walkable(nx, ny, me)) continue;
      prev.set(k, key(x, y));
      if (goalSet.has(k)) {
        const path = [];
        let cur = k;
        while (cur && cur !== key(sx, sy)) { path.unshift(cur.split(",").map(Number)); cur = prev.get(cur); }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}
function startStep(a, nx, ny) { a.dir = dirTo(a.x, a.y, nx, ny); a.ox = a.x; a.oy = a.y; a.x = nx; a.y = ny; a.t = 0; }

// ── 대화창 ──
const dlg = { open: false, pages: [], i: 0, shown: 0, who: "", choices: null, onClose: null };
function say(who, pages, choices, onClose) {
  Object.assign(dlg, { open: true, pages, i: 0, shown: 0, who, choices: choices || null, onClose: onClose || null });
  $("dialog").classList.remove("idle");
  $("stage").classList.add("talking");
  $("dlg-who").textContent = who || "";
  paintDialog();
}
function paintDialog() {
  const full = dlg.pages[dlg.i];
  $("dlg-text").textContent = full.slice(0, Math.floor(dlg.shown));
  const box = $("dlg-choices");
  const showChoices = dlg.shown >= full.length && dlg.i === dlg.pages.length - 1 && dlg.choices;
  if (showChoices && !box.childElementCount) {
    dlg.choices.forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.addEventListener("click", (e) => { e.stopPropagation(); closeDialog(); if (fn) fn(); });
      box.appendChild(b);
    });
  } else if (!showChoices) box.innerHTML = "";
}
function advance() {
  if (!dlg.open) return;
  const full = dlg.pages[dlg.i];
  if (dlg.shown < full.length) { dlg.shown = full.length; paintDialog(); return; }
  if (dlg.i < dlg.pages.length - 1) { dlg.i++; dlg.shown = 0; paintDialog(); return; }
  if (dlg.choices) return;
  const cb = dlg.onClose;
  closeDialog();
  if (cb) cb();
}
let guide = null; // 빨간 표시 안내는 쓰지 않는다(아무 데도 이어지지 않아 헷갈렸다)
// 관리 포인트별로 흔히 쓰는 성분(일반 정보, 진단 아님)
const FOCUS_TIP = {
  hydration: ["히알루론산·세라마이드 같은 보습 성분", "moisturizing ingredients like hyaluronic acid and ceramides"],
  oil: ["나이아신아마이드, 가벼운 젤 타입 보습", "niacinamide and a light gel moisturizer"],
  wrinkle: ["레티놀(밤에만)·펩타이드, 낮에는 선크림", "retinol (at night) and peptides, sunscreen by day"],
  tone: ["비타민C와 매일 바르는 선크림", "vitamin C and daily sunscreen"],
  trouble: ["살리실산(BHA)·병풀 같은 진정 성분", "soothing ingredients like salicylic acid (BHA) and centella"],
  pores: ["살리실산(BHA)·나이아신아마이드", "salicylic acid (BHA) and niacinamide"],
  redness: ["판테놀·병풀 같은 진정 성분, 자극 적은 제품", "calming ingredients like panthenol and centella"],
  elasticity: ["펩타이드·레티놀과 꾸준한 보습", "peptides, retinol and steady moisturizing"],
};
let skin = null;
function closeDialog() {
  dlg.open = false;
  $("dialog").classList.add("idle");
  $("stage").classList.remove("talking");
  $("dlg-who").textContent = "";
  $("dlg-choices").innerHTML = "";
  $("dlg-text").textContent = L("바닥을 눌러 걷고, 선반이나 사람을 누르면 말을 걸어요.", "Tap the floor to walk. Tap shelves or people to interact.");
}
$("dialog").addEventListener("click", advance);

// ── 상호작용(할 일은 세 가지: 걷기, 선반 보기, 측정) ──
function interactTile(x, y) {
  const ch = at(x, y);
  const npc = npcs.find((n) => n.x === x && n.y === y);
  if (npc) return talkTo(npc);
  if (ZONES[ch]) return shelf(x, y, ch);
  if (ch === "M") return talkTo(npcs.find((n) => n.kind === "booth"));
  if (ch === "S") return sitDown(y);
  if (ch === "C") return say("", [L("따뜻한 커피 한 잔과 읽다 만 책. 소파에 앉아서 쉬어 가도 돼요.", "A warm coffee and a half-read book. Feel free to sit on the sofa.")]);
  if (ch === "T") return openMirror();
  if (ch === "D") return say("", [L("라운지를 나갈까요?", "Leave the lounge?")], [[L("cellfie.me 홈으로", "Go to cellfie.me"), () => { location.href = "../"; }], [L("더 둘러보기", "Stay"), null]]);
  if (ch === "V") return openTV();
  if (ch === "B") return openApps();
  if (ch === "L") return openLibrary(skin ? skin.worst : null);
  if (ch === "P") return say("", [L("잘 자란 화분. 물은 직원이 준다고 한다.", "A healthy plant.")]);
}
function shelf(x, y, z) {
  const zone = ZONES[z];
  if (guide === z) guide = null;
  const n = boardCounts[zone.key];
  const corner = [L(`코너 열기${n ? ` (이야기 ${n})` : ""}`, `Open corner${n ? ` (${n} notes)` : ""}`), () => openBoard(zone.key)];
  if (!zone.url) {
    return say(L(zone.name[0], zone.name[1]), [
      L("다들 오래 쓴 인생템을 메모로 붙여 두는 코너예요.", "A corner where people pin their all-time favorite products."),
      `${L("오늘의 질문", "Today's question")}\n${L(...todayQuestion(zone.key))}`,
    ], [corner, [L("닫기", "Close"), null]]);
  }
  say(L(zone.name[0], zone.name[1]), [
    L(`지금 ${eul(zone.name[0])} 바로 열어 볼 수 있어요.\nCellfie와 제휴 관계가 없는 외부 사이트로 이동해요.`, `Open the live ${zone.name[1]} in one tap.\nThis goes to an external site not affiliated with Cellfie.`),
  ], [[L("랭킹 바로 가기 ↗", "Open ranking ↗"), () => openLink(zone.url, "link_" + zone.key)], corner]);
}
function openLink(url, event) {
  stat(event);
  window.open(url, "_blank", "noopener");
}
function talkTo(n) {
  if (!n) return;
  n.dir = dirTo(n.x, n.y, me.x, me.y);
  n.pause = performance.now() + 4000;
  const who = L(n.name[0], n.name[1]);
  if (n.kind === "booth") {
    if (skin) {
      const tip = FOCUS_TIP[skin.worst] || FOCUS_TIP.hydration;
      return say(who, [
        L(`피부 나이 ${skin.age}세로 나왔어요. 관리 포인트는 ${ieyo(axisLabel(skin.worst))}.`, `Your skin age is ${skin.age}. Your focus is ${axisLabel(skin.worst)}.`),
        L(`${axisLabel(skin.worst)}에는 보통 ${tip[0]}을 많이 써요. 내 피부에 맞는지는 Cellfie 앱에서 매일 찍어 기록으로 확인할 수 있어요.`, `For ${axisLabel(skin.worst).toLowerCase()}, people often use ${tip[1]}. The Cellfie app shows what actually works for you from daily photos.`)],
        [[L("앱에서 추천받기", "Get picks in the app"), openApps], [L("성분 도서관", "Ingredient library"), () => openLibrary(skin.worst)], [L("다시 측정", "Measure again"), openBooth]]);
    }
    return say(who, [
      L("어서 오세요! 셀카 한 장이면 피부 나이랑 8가지 점수를 재 드려요.", "Welcome! One selfie and I'll measure your skin age and 8 scores."),
      L("사진은 분석이 끝나면 바로 지워져요. 해 볼래요?", "The photo is deleted right after. Want to try?")],
      [[L("측정하기", "Measure"), openBooth], [L("다음에요", "Maybe later"), null]]);
  }
  if (n.kind === "clerk") {
    return say(who, [L("오늘은 둘러보기만 해도 괜찮아요. 천천히 구경하세요.", "Just browsing is fine today. Take your time.")]);
  }
  const line = n.lines[Math.floor(Math.random() * n.lines.length)];
  say(who, [L(line[0], line[1])]);
}

// ── 앉아서 쉬기: 소파를 누르면 앉고, 아무 데나 누르면 일어난다 ──
let seated = null; // 앉은 소파 칸의 y
function sitDown(y) {
  const taken = [...remotes.values()].find((r) => r.seat === y - SOFA_Y);
  if (taken) return say("", [L(`${taken.nick} 님이 앉아 있어요. 다른 자리에 앉아 보세요.`, `${taken.nick} is sitting there. Try another seat.`)]);
  seated = y;
  me.path = []; me.goal = null;
  me.dir = "right";
  sitStart = performance.now();
  // 일어나는 길은 셋: 이 버튼, 화면 아무 데나 누르기, 방향키
  say("", [L("소파에 앉아 쉬는 중이에요.", "Resting on the sofa.")], [[L("일어나기", "Stand up"), standUp]]);
  stat("sit");
}
let sitStart = 0;
function standUp() { seated = null; closeDialog(); }

// ── 입력: 누른 곳으로 걸어간다 ──
function goTo(tx, ty, npc) {
  // 선택지가 떠 있을 때 매장을 누르면 그 대화는 닫고 누른 곳으로 간다(선택지에 갇히지 않게)
  if (dlg.open && dlg.choices && dlg.i === dlg.pages.length - 1 && dlg.shown >= dlg.pages[dlg.i].length) closeDialog();
  if (dlg.open) return advance();
  npc = npc || npcs.find((n) => n.x === tx && n.y === ty);
  const ch = at(tx, ty);
  const isTarget = npc || (ch !== "." && ch !== "#" && ch !== "x");
  if (!isTarget) {
    if (ch !== ".") return;
    const path = findPath(me.x, me.y, [[tx, ty]]);
    if (path) { me.path = path; me.goal = null; }
    return;
  }
  const near = npc ? (Math.abs(npc.x - me.x) + Math.abs(npc.y - me.y) === 1 ? [npc.x, npc.y] : null) : adjacentPart(tx, ty);
  if (near && me.t >= 1) { me.dir = dirTo(me.x, me.y, near[0], near[1]); me.path = []; return interactTile(near[0], near[1]); }
  const spots = (npc ? [[npc.x, npc.y]] : group(tx, ty)).flatMap(([x, y]) => neighbors(x, y));
  const path = findPath(me.x, me.y, spots.filter(([x, y]) => at(x, y) === "."));
  if (path) { me.path = path; me.goal = [tx, ty, npc || null]; }
}
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color: "#88B04B", transparent: true, opacity: 0 }));
tapRing.rotation.x = -Math.PI / 2; tapRing.position.y = 0.02; scene.add(tapRing);
let tapAt = 0;
function showTap(x, z) { tapRing.position.x = x; tapRing.position.z = z; tapAt = performance.now(); }
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener("pointerdown", (e) => {
  if (seated !== null) return standUp();
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, true)[0];
  if (hit) {
    const ud = hit.object.userData;
    if (ud.actor && ud.actor.remote) return greet(ud.actor);
    if (ud.actor && ud.actor !== me) return goTo(ud.actor.x, ud.actor.y, ud.actor);
    if (ud.tile) return goTo(ud.tile[0], ud.tile[1]);
  }
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(floorPlane, p)) { showTap(Math.floor(p.x) + 0.5, Math.floor(p.z) + 0.5); goTo(Math.floor(p.x), Math.floor(p.z)); }
});
const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const held = new Set();
window.addEventListener("keydown", (e) => {
  if (document.querySelector(".modal:not([hidden])") || e.target.tagName === "TEXTAREA") return;
  if (seated !== null && (KEYS[e.key] || e.key === " " || e.key === "Enter" || e.key === "Escape")) { e.preventDefault(); return standUp(); }
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if (dlg.open) return advance();
    const [dx, dy] = STEP[me.dir];
    return interactTile(me.x + dx, me.y + dy);
  }
  const dir = KEYS[e.key];
  if (dir) { e.preventDefault(); held.add(dir); me.path = []; me.goal = null; }
});
window.addEventListener("keyup", (e) => { const dir = KEYS[e.key]; if (dir) held.delete(dir); });

// ── 갱신 ──
const SPEED = 1 / 260; // 칸당 260ms: 천천히 걷는다
const YAW = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
function update(dt, now) {
  [me, ...npcs].forEach((a) => { if (a.t < 1) a.t = Math.min(1, a.t + dt * SPEED); });
  remotes.forEach((a) => { if (a.t < 1) a.t = Math.min(1, a.t + dt * SPEED * 0.8); });
  if (me.t >= 1 && !dlg.open && seated === null) {
    if (me.path.length) {
      const [nx, ny] = me.path[0];
      if (walkable(nx, ny, me)) { me.path.shift(); startStep(me, nx, ny); }
      else if (me.goal) { const g = me.goal; me.path = []; goTo(g[0], g[1], g[2]); }
      else me.path = [];
    } else if (me.goal) {
      const [gx, gy, npc] = me.goal;
      me.goal = null;
      const part = npc ? (Math.abs(npc.x - me.x) + Math.abs(npc.y - me.y) === 1 ? [npc.x, npc.y] : null) : adjacentPart(gx, gy);
      if (part) { me.dir = dirTo(me.x, me.y, part[0], part[1]); interactTile(part[0], part[1]); }
      else if (npc) goTo(npc.x, npc.y, npc);
    } else if (held.size) {
      const dir = [...held].pop();
      const [dx, dy] = STEP[dir];
      me.dir = dir;
      if (walkable(me.x + dx, me.y + dy, me)) startStep(me, me.x + dx, me.y + dy);
    }
  }
  npcs.forEach((n) => {
    if (!n.wander || n.t < 1 || dlg.open || (n.pause && now < n.pause)) return;
    if (Math.random() < dt / 1100) {
      const opts = neighbors(n.x, n.y).filter(([x, y]) => walkable(x, y, n) && Math.abs(x - n.x0) + Math.abs(y - n.y0) <= 5);
      if (opts.length) { const [x, y] = opts[Math.floor(Math.random() * opts.length)]; startStep(n, x, y); }
      // 옆에 선반이 있으면 그쪽을 보고 잠깐 구경한다
      const shelfSide = neighbors(n.x, n.y).find(([x, y]) => ZONES[at(x, y)]);
      if (shelfSide && Math.random() < 0.5) { n.dir = dirTo(n.x, n.y, shelfSide[0], shelfSide[1]); n.pause = now + 1500 + Math.random() * 2500; }
    }
  });
  if (dlg.open && dlg.shown < dlg.pages[dlg.i].length) { dlg.shown += dt * 0.05; paintDialog(); }
}
function updateHud() {
  let zone = null, best = 3;
  Object.entries(zoneTiles).forEach(([z, tiles]) => tiles.forEach(([x, y]) => {
    const d = Math.abs(x - me.x) + Math.abs(y - me.y);
    if (d < best) { best = d; zone = z; }
  }));
  const near = Math.abs(me.x - 10.5) + Math.abs(me.y - 11.5) <= 3 ? L("측정 부스", "Skin booth")
    : Math.abs(me.x - 14.5) + Math.abs(me.y - 11) <= 2 ? L("뷰티 TV", "Beauty TV")
    : me.x <= 3 && me.y >= 6 && me.y <= 9 ? L("성분 도서관", "Ingredient library")
    : me.y >= 3 && me.y <= 5 && me.x >= 7 && me.x <= 13 ? L("거울", "Mirror")
    : Math.abs(me.x - (W - 2)) + Math.abs(me.y - 14.5) <= 2 ? L("앱 책장", "App shelf") : null;
  $("zone").textContent = near || (zone ? L(`${ZONES[zone].name[0]} 구역`, ZONES[zone].name[1]) : L("셀피 라운지", "Cellfie Lounge"));
  // 서버에서 인원을 받은 뒤에만 보인다(연결 전·실패 땐 숨김)
  $("room").textContent = roomHere ? L(`${room}호점 · 손님 ${roomHere}명`, `Shop #${room} · ${roomHere} here`) : "";
  $("room").hidden = !roomHere;
}

// ── 그리기 ──
const guideCone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 20), new THREE.MeshStandardMaterial({ color: "#E0453A", emissive: "#7A1A12" }));
guideCone.rotation.x = Math.PI;
guideCone.visible = false;
scene.add(guideCone);
const bubbleTex = textTexture((g, w, h) => {
  g.fillStyle = "#FFFFFF"; g.beginPath(); g.roundRect(8, 8, w - 16, h - 30, 24); g.fill();
  g.beginPath(); g.moveTo(w / 2 - 12, h - 24); g.lineTo(w / 2, h - 6); g.lineTo(w / 2 + 12, h - 24); g.fill();
  g.fillStyle = "#4F6E25"; g.font = FONT(56, 800); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("…", w / 2, h / 2 - 16);
}, 128, 110);
const bubbles = npcs.filter((n) => n.kind !== "shopper").map((n) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthWrite: false }));
  s.scale.set(0.34, 0.29, 1);
  scene.add(s);
  return [n, s];
});
// 손님 머리 위에 짧은 혼잣말이 가끔 뜬다
const CHATTER = [["오 이거 향 좋다", "Ooh, smells nice"], ["이거 써 본 사람?", "Anyone tried this?"], ["선크림 다 떨어졌는데", "Out of sunscreen…"], ["피부 나이 재 볼까", "Should I check my skin age?"], ["이거 지난번에 좋았어", "This one was good"], ["세일 언제 하지", "When's the sale?"], ["게시판 글 웃기다", "The board is funny"], ["촉촉하다", "So hydrating"]];
const chatTexCache = {};
function chatTexture(text) {
  if (chatTexCache[text]) return chatTexCache[text];
  return (chatTexCache[text] = textTexture((g, w, h) => {
    g.font = FONT(30, 700);
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.roundRect(6, 6, w - 12, h - 30, 26); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 12, h - 26); g.lineTo(w / 2, h - 6); g.lineTo(w / 2 + 12, h - 26); g.fill();
    g.fillStyle = "#1F2419"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, (h - 24) / 2 + 4);
  }, 360, 96));
}
const chat = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
chat.scale.set(1.35, 0.36, 1);
chat.visible = false;
scene.add(chat);
let chatUntil = 0, chatNext = 1500, chatWho = null;
function updateChatter(now) {
  if (chatWho && now < chatUntil) {
    chat.position.set(chatWho.mesh.position.x, 1.55 + Math.sin(now / 300) * 0.03, chatWho.mesh.position.z);
    chat.material.opacity = Math.min(1, (chatUntil - now) / 300);
    return;
  }
  chat.visible = false;
  if (now < chatNext) return;
  const shoppers = npcs.filter((n) => n.kind === "shopper");
  chatWho = shoppers[Math.floor(Math.random() * shoppers.length)];
  const line = CHATTER[Math.floor(Math.random() * CHATTER.length)];
  chat.material.map = chatTexture(L(line[0], line[1]));
  chat.material.needsUpdate = true;
  chat.visible = true;
  chatUntil = now + 2600;
  chatNext = chatUntil + 1500 + Math.random() * 2500;
}

// 공중에 천천히 떠오르는 빛 알갱이
const motes = (() => {
  const n = 70, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = 1.5 + Math.random() * (W - 3); pos[i * 3 + 1] = Math.random() * 2.8; pos[i * 3 + 2] = 1.5 + Math.random() * (H - 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = textTexture((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 32, 32);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, map: dot, transparent: true, depthWrite: false, opacity: 0.8 }));
  scene.add(pts);
  return pts;
})();

const camTarget = new THREE.Vector3(cx(me.x), 0, cz(me.y));
const camPos = new THREE.Vector3(cx(me.x), 9.5, cz(me.y) + 8.6);
function draw(dt, now) {
  [me, ...npcs, ...remotes.values()].forEach((a) => {
    const k = a.t < 1 ? a.t * a.t * (3 - 2 * a.t) : 1;
    const x = a.ox + (a.x - a.ox) * k, z = a.oy + (a.y - a.oy) * k;
    const moving = a.t < 1;
    a.walk = moving ? a.walk + dt * 0.012 : a.walk * 0.85;
    const swing = moving ? Math.sin(a.walk) * 0.55 : 0;
    // 몸 방향은 부드럽게 돌린다
    let d = YAW[a.dir] - a.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    a.yaw += d * Math.min(1, dt * 0.015);
    a.mesh.position.set(cx(x), moving ? Math.abs(Math.sin(a.walk)) * 0.04 : 0, cz(z));
    a.mesh.scale.y = moving ? 1 : 1 + Math.sin(now / 600 + a.x * 1.7 + a.y) * 0.015;
    a.mesh.rotation.y = a.yaw;
    a.mesh.userData.legs[0].rotation.x = swing; a.mesh.userData.legs[1].rotation.x = -swing;
    a.mesh.userData.arms[0].rotation.x = -swing * 0.8; a.mesh.userData.arms[1].rotation.x = swing * 0.8;
    const seatY = a === me ? seated : (a.remote && a.seat >= 0 ? SOFA_Y + a.seat : null);
    if (seatY !== null) {
      const k2 = a === me ? Math.min(1, (now - sitStart) / 400) : 1;
      a.mesh.position.set(cx(a.x) + (1.6 - cx(a.x)) * k2, 0.2 * k2, cz(seatY) + (cz(a.y) - cz(seatY)) * (1 - k2));
      a.mesh.userData.legs.forEach((l) => { l.rotation.x = -1.4 * k2; });
      a.mesh.userData.arms.forEach((l) => { l.rotation.x = -0.4 * k2; });
      a.yaw = Math.PI / 2; a.mesh.rotation.y = a.yaw;
    }
    // 인사받거나 인사할 때 오른팔을 흔든다
    if (a.waveUntil && now < a.waveUntil) a.mesh.userData.arms[1].rotation.set(0, 0, 2.4 + Math.sin(now / 90) * 0.4);
    else a.mesh.userData.arms[1].rotation.z = 0;
    a.mesh.userData.mask.visible = a === me ? myMask : !!a.mask;
    if (a.label) a.label.position.set(a.mesh.position.x, a.mesh.position.y + 1.32, a.mesh.position.z);
  });
  if (scanLine) scanLine.position.y = 1.42 + Math.sin(now / 500) * 0.38;
  updateChatter(now);
  { const k = (now - tapAt) / 600; tapRing.material.opacity = k < 1 ? 0.8 * (1 - k) : 0; tapRing.scale.setScalar(1 + Math.min(1, k) * 0.6); }
  const mp = motes.geometry.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    let y = mp.getY(i) + dt * 0.00012;
    if (y > 2.9) y = 0.1;
    mp.setY(i, y);
    mp.setX(i, mp.getX(i) + Math.sin(now / 1500 + i) * 0.0006);
  }
  mp.needsUpdate = true;
  bubbles.forEach(([n, s]) => s.position.set(n.mesh.position.x, 1.35 + Math.sin(now / 400) * 0.04, n.mesh.position.z));
  if (guide && zoneTiles[guide]) {
    const [gx, gy] = zoneTiles[guide][Math.floor(zoneTiles[guide].length / 2)];
    guideCone.visible = true;
    guideCone.position.set(cx(gx), 2.0 + Math.sin(now / 250) * 0.1, cz(gy) + (gy === 1 ? 0.2 : 0));
    guideCone.rotation.y = now / 600;
  } else guideCone.visible = false;

  // 카메라: 산사처럼 캐릭터 가까이, 낮은 각도(약 30도)로 따라간다. 높이·거리·각도는 바뀌지 않고 위치만 부드럽게 따라온다.
  // 매장 끝에서는 따라가기를 멈춰 바깥 빈 땅이 화면을 차지하지 않게 한다.
  const tx = Math.max(CAM.minX, Math.min(W - CAM.minX, me.mesh.position.x));
  const tz = Math.max(3.2, Math.min(H - 2.2, me.mesh.position.z));
  const k = 1 - Math.exp(-dt * 0.004);
  camX += (tx - camX) * k;
  camZ += (tz - camZ) * k;
  camera.position.set(camX, CAM.y, camZ + CAM.back);
  camera.lookAt(camX, 0.7, camZ - CAM.ahead);
  renderer.render(scene, camera);
}
const CAM = { y: 5.4, back: 8.4, ahead: 1.2, minX: 4 };
let camX = cx(me.x), camZ = cz(me.y);
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const wide = w >= h;
  // 넓은 화면은 조금 더 넓게, 세로 화면은 화각을 넓혀 좌우가 덜 잘리게
  camera.fov = wide ? 46 : 60;
  Object.assign(CAM, wide ? { y: 5.4, back: 8.4, ahead: 1.2, minX: 5 } : { y: 5.8, back: 8.2, ahead: 1.4, minX: 3.2 });
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

let prev = performance.now(), hudTick = 0, firstFrame = true;
function frame(now) {
  const dt = Math.min(50, now - prev);
  prev = now;
  update(dt, now);
  draw(dt, now);
  if (firstFrame) { firstFrame = false; $("loading").classList.add("done"); }
  if ((hudTick += dt) > 250) { hudTick = 0; updateHud(); }
  requestAnimationFrame(frame);
}

// ── 같이 있는 손님: 2초마다 내 상태를 보내고 같은 지점 손님을 받는다(서버 메모리만) ──
const remotes = new Map();
let myMask = false;
let room = store.get("cellfie-store-room") || 0;
let roomHere = 0, onlineAll = 0, roomCounts = null;
// 탭마다 다른 손님으로 보이게 세션 저장소에 둔다
const ses = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
let clientId = ses.get("cellfie-store-id");
if (!/^[a-z0-9]{8,32}$/.test(clientId || "")) { clientId = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join(""); ses.set("cellfie-store-id", clientId); }
function nameTag(text) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture((g, w, h) => {
    g.font = FONT(30, 700); g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.roundRect(4, 8, w - 8, h - 16, 22); g.fill();
    g.fillStyle = "#3D4636"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 2);
  }, 320, 64), depthWrite: false, transparent: true }));
  sp.scale.set(0.95, 0.19, 1);
  scene.add(sp);
  return sp;
}
async function presence() {
  if (document.hidden) return;
  try {
    const r = await fetch(`${API}/web/presence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      id: clientId, room: room || null, nick: myNick(), look: myLook, x: me.x, y: me.y, dir: me.dir, seat: seated !== null ? seated - SOFA_Y : -1, mask: myMask }) });
    if (!r.ok) return;
    const st = await r.json();
    room = st.room; roomHere = st.here; onlineAll = st.online; roomCounts = st.rooms || null;
    store.set("cellfie-store-room", room);
    const seen = new Set();
    st.others.forEach((o) => {
      seen.add(o.id);
      let a = remotes.get(o.id);
      if (!a) {
        a = { remote: true, id: o.id, x: o.x, y: o.y, ox: o.x, oy: o.y, t: 1, dir: o.dir, yaw: YAW[o.dir] || 0, walk: 0, look: o.look };
        setMesh(a, lookPalette(o.look));
        a.label = nameTag(o.nick);
        remotes.set(o.id, a);
      }
      if (a.look !== o.look) { a.look = o.look; setMesh(a, lookPalette(o.look)); }
      if (a.x !== o.x || a.y !== o.y) { a.ox = a.ox + (a.x - a.ox) * Math.min(1, a.t); a.oy = a.oy + (a.y - a.oy) * Math.min(1, a.t); a.x = o.x; a.y = o.y; a.t = 0; }
      a.dir = o.dir; a.seat = o.seat; a.mask = o.mask; a.nick = o.nick;
    });
    remotes.forEach((a, id) => { if (!seen.has(id)) { scene.remove(a.mesh); scene.remove(a.label); const i = pickables.indexOf(a.mesh); if (i >= 0) pickables.splice(i, 1); remotes.delete(id); } });
    (st.waves || []).forEach((from) => { toast(L(`${from} 님이 인사했어요 👋`, `${from} waved at you 👋`)); me.waveUntil = performance.now() + 1600; });
    updateHud();
    paintMaskTime();
  } catch (e) { /* 서버가 없으면 혼자 둘러본다 */ }
}
setInterval(presence, 2000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) presence(); });
function greet(a) {
  say(a.nick, [L("같은 매장에 있는 손님이에요. 말은 걸 수 없지만 인사는 할 수 있어요.", "Another visitor in this shop. You can't chat, but you can wave.")],
    [[L("인사하기 👋", "Wave 👋"), async () => {
      me.waveUntil = performance.now() + 1600;
      stat("wave");
      try { await fetch(`${API}/web/presence/wave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: clientId, to: a.id }) }); } catch (e) {}
      toast(L(`${a.nick} 님에게 인사했어요`, `You waved at ${a.nick}`));
    }], [L("닫기", "Close"), null]]);
}
let toastTimer = null;
function toast(text) {
  const el = $("toast");
  el.textContent = text; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

// 밤 10시 마스크팩 타임(한국 시각 22:00~22:30): 같이 쓰는 사람 수를 보여 준다
function kstNow() { const n = new Date(Date.now() + 9 * 3600000); return { h: n.getUTCHours(), m: n.getUTCMinutes() }; }
const maskForced = local && new URLSearchParams(location.search).has("masktime");
function isMaskTime() { const { h, m } = kstNow(); return maskForced || (h === 22 && m < 30); }
function paintMaskTime() {
  const el = $("masktime");
  if (isMaskTime()) {
    const n = [...remotes.values()].filter((r) => r.mask).length + (myMask ? 1 : 0);
    el.hidden = false;
    $("mt-text").textContent = L(`밤 10시 마스크팩 타임 · 지금 ${n}명 같이 붙이는 중`, `10 PM sheet mask time · ${n} wearing one now`);
    $("mt-btn").textContent = myMask ? L("떼기", "Take off") : L("같이 붙이기", "Join");
  } else {
    if (myMask) myMask = false;
    el.hidden = true;
  }
  $("mt-btn").hidden = !isMaskTime();
}
$("mt-btn").addEventListener("click", () => { myMask = !myMask; if (myMask) stat("mask_time"); paintMaskTime(); presence(); });
setInterval(paintMaskTime, 30000);

// 꾸미기
function openLook() {
  const cur = parseLook(myLook);
  const paint = () => {
    const { h, c, a } = parseLook(myLook);
    document.querySelectorAll("#lk-hair button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === h)));
    document.querySelectorAll("#lk-cloth button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === c)));
    document.querySelectorAll("#lk-acc button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === a)));
  };
  const set = (k, v) => {
    const l = parseLook(myLook); l[k] = v;
    myLook = `h${l.h}c${l.c}a${l.a}`;
    store.set("cellfie-store-look", myLook);
    setMesh(me, lookPalette(myLook));
    paint();
  };
  const fill = (id, list, k, swatch) => {
    const box = $(id); box.innerHTML = "";
    list.forEach((v, i) => {
      const b = document.createElement("button"); b.type = "button";
      if (swatch) { b.className = "sw"; b.style.background = v; b.setAttribute("aria-label", v); } else b.textContent = L(v[0], v[1]);
      b.addEventListener("click", () => set(k, i));
      box.appendChild(b);
    });
  };
  fill("lk-hair", HAIRS, "h", true); fill("lk-cloth", CLOTHS, "c", true); fill("lk-acc", ACCS, "a", false);
  paint();
  $("lk-nick").textContent = myNick();
  $("m-look").hidden = false;
  stat("customize");
  void cur;
}
$("btn-look").addEventListener("click", openLook);

// ── 성분 도서관: 관리 포인트별 성분과 근거 논문(모두 PubMed 에서 PMID 확인, 2026-11-08) ──
const PAPERS = {
  ha: ["Papakonstantinou E 외, 2012", "Dermatoendocrinol", "Hyaluronic acid: A key molecule in skin aging", 23467280],
  cer: ["Meckfessel MH 외, 2014", "J Am Acad Dermatol", "The structure, function, and importance of ceramides in skin and their use as therapeutic agents in skin-care products", 24656726],
  niaSebum: ["Draelos ZD 외, 2006", "J Cosmet Laser Ther", "The effect of 2% niacinamide on facial sebum production", 16766489],
  niaAging: ["Bissett DL 외, 2004", "Int J Cosmet Sci", "Topical niacinamide reduces yellowing, wrinkling, red blotchiness, and hyperpigmented spots in aging facial skin", 18492135],
  ret: ["Kong R 외, 2016", "J Cosmet Dermatol", "A comparative study of the effects of retinol and retinoic acid on histological, molecular, and clinical properties of human skin", 26578346],
  pep: ["Gorouhi F 외, 2009", "Int J Cosmet Sci", "Role of topical peptides in preventing or treating aged skin", 19570099],
  vitc: ["Pullar JM 외, 2017", "Nutrients", "The Roles of Vitamin C in Skin Health", 28805671],
  sun: ["Hughes MC 외, 2013", "Ann Intern Med", "Sunscreen and prevention of skin aging: a randomized trial", 23732711],
  sa: ["Arif T, 2015", "Clin Cosmet Investig Dermatol", "Salicylic acid as a peeling agent: a comprehensive review", 26347269],
  cica: ["Bylka W 외, 2013", "Postepy Dermatol Alergol", "Centella asiatica in cosmetology", 24278045],
  pan: ["Proksch E 외, 2017", "J Dermatolog Treat", "Topical use of dexpanthenol: a 70th anniversary article", 28503966],
};
const ING = {
  ha: [["히알루론산", "Hyaluronic acid"], ["수분을 붙잡아 두는 보습 성분. 피부 속 히알루론산은 나이가 들며 줄어든다.", "Holds water in skin; the skin's own hyaluronic acid declines with age."], ["ha"]],
  cer: [["세라마이드", "Ceramides"], ["피부 장벽을 이루는 지질. 장벽이 약해 건조할 때 채워 준다.", "Lipids that build the skin barrier; helpful when a weak barrier causes dryness."], ["cer"]],
  nia: [["나이아신아마이드", "Niacinamide"], ["피지 분비를 줄였다는 연구와, 누런 기·잔주름·붉은 얼룩·색소 반점이 나아졌다는 연구가 있다.", "Studies report less sebum, and less yellowing, fine lines, red blotchiness and spots."], ["niaSebum", "niaAging"]],
  ret: [["레티놀", "Retinol"], ["주름과 탄력에 대표적으로 쓰인다. 밤에만, 처음엔 주 2~3회부터.", "A go-to for lines and firmness. Night only, start 2 to 3 times a week."], ["ret"]],
  pep: [["펩타이드", "Peptides"], ["노화 피부 관리에 쓰이는 성분군. 자극이 적어 레티놀이 부담될 때 쓴다.", "A group used for aging skin; gentle when retinol is too much."], ["pep"]],
  vitc: [["비타민C", "Vitamin C"], ["칙칙한 톤과 광노화 관리에 쓰인다. 빛과 공기에 약하다.", "Used for dull tone and photoaging; breaks down in light and air."], ["vitc"]],
  sun: [["자외선 차단제", "Sunscreen"], ["매일 바른 사람들의 피부 노화가 덜 진행됐다는 무작위 대조 연구가 있다.", "A randomized trial found less skin aging in daily sunscreen users."], ["sun"]],
  sa: [["살리실산(BHA)", "Salicylic acid (BHA)"], ["기름에 녹아 모공 속 피지·각질을 정리한다. 여드름·모공 관리에 쓰인다.", "Oil-soluble; clears sebum and dead skin in pores. Used for acne and pores."], ["sa"]],
  cica: [["병풀(센텔라)", "Centella asiatica"], ["자극받은 피부를 진정시키는 데 쓰인다.", "Used to soothe irritated skin."], ["cica"]],
  pan: [["판테놀", "Panthenol"], ["피부 장벽 회복과 진정에 쓰이는 비타민 B5 성분.", "Vitamin B5 used for barrier repair and soothing."], ["pan"]],
};
const LIBRARY = {
  hydration: ["ha", "cer"], oil: ["nia"], wrinkle: ["ret", "pep", "sun"], tone: ["vitc", "nia", "sun"],
  trouble: ["sa", "cica"], pores: ["sa", "nia"], redness: ["pan", "cica", "nia"], elasticity: ["pep", "ret", "ha"],
};
let libFocus = "hydration";
function openLibrary(focus) {
  if (focus && LIBRARY[focus]) libFocus = focus;
  const tabs = $("lib-tabs");
  tabs.innerHTML = "";
  AXES.forEach(([k]) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = axisLabel(k);
    b.setAttribute("aria-pressed", String(k === libFocus));
    b.addEventListener("click", () => openLibrary(k));
    tabs.appendChild(b);
  });
  const list = $("lib-list");
  list.innerHTML = "";
  LIBRARY[libFocus].forEach((id) => {
    const [name, desc, refs] = ING[id];
    const card = document.createElement("div");
    card.className = "ing";
    const h3 = document.createElement("b"); h3.textContent = L(name[0], name[1]);
    const pr = document.createElement("p"); pr.textContent = L(desc[0], desc[1]);
    card.append(h3, pr);
    refs.forEach((r) => {
      const [who, journal, title, pmid] = PAPERS[r];
      const a = document.createElement("a");
      a.href = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`; a.target = "_blank"; a.rel = "noopener";
      a.textContent = `📄 ${who.replace(" 외,", lang === "en" ? " et al.," : " 외,")} · ${journal} · ${title}`;
      a.addEventListener("click", () => stat("paper"));
      card.appendChild(a);
    });
    list.appendChild(card);
  });
  $("m-lib").hidden = false;
  stat("library");
}
$("q-lib").addEventListener("click", () => openLibrary(skin ? skin.worst : null));

// ── 한곳에 모은 링크: 뷰티 TV, 앱 받기, 랭킹 코너 모음 ──
function linkRow(title, sub, url, event) {
  const a = document.createElement("a");
  a.className = "row"; a.href = url; a.target = "_blank"; a.rel = "noopener";
  a.addEventListener("click", () => stat(event));
  const t = document.createElement("span"); t.className = "row-t"; t.textContent = title;
  const s2 = document.createElement("span"); s2.className = "row-s"; s2.textContent = sub;
  const arrow = document.createElement("span"); arrow.className = "row-a"; arrow.textContent = "↗";
  a.append(t, s2, arrow);
  return a;
}
function openTV() {
  const ko = $("tv-ko"), en = $("tv-en");
  ko.innerHTML = ""; en.innerHTML = "";
  CREATORS.ko.forEach(([n, tag, url]) => ko.appendChild(linkRow(n, tag, url, "youtube")));
  CREATORS.en.forEach(([n, tag, url]) => en.appendChild(linkRow(n, tag, url, "youtube")));
  $("m-tv").hidden = false;
  stat("tv");
}
function openApps() {
  $("m-app").hidden = false;
}
$("app-play").href = APP_LINKS.play; $("app-play").addEventListener("click", () => stat("play_store"));
$("app-apple").href = APP_LINKS.apple; $("app-apple").addEventListener("click", () => stat("app_store"));
function openCorners() {
  const box = $("corner-list");
  box.innerHTML = "";
  Object.values(ZONES).forEach((z) => {
    const row = document.createElement("div");
    row.className = "corner";
    const dot = document.createElement("i"); dot.style.background = z.color;
    const name = document.createElement("span"); name.textContent = L(z.name[0], z.name[1]);
    row.append(dot, name);
    if (z.url) {
      const go = document.createElement("a"); go.href = z.url; go.target = "_blank"; go.rel = "noopener"; go.textContent = L("바로 가기 ↗", "Open ↗");
      go.addEventListener("click", () => stat("link_" + z.key));
      row.appendChild(go);
    }
    const n = boardCounts[z.key];
    const board = document.createElement("button"); board.type = "button"; board.textContent = L(`게시판${n ? ` ${n}` : ""}`, `Notes${n ? ` ${n}` : ""}`);
    board.addEventListener("click", () => { $("m-corners").hidden = true; openBoard(z.key); });
    row.appendChild(board);
    box.appendChild(row);
  });
  $("m-corners").hidden = false;
}

// 아래 바로가기: 누르면 그 자리로 걸어가서 연다(걷기가 귀찮으면 바로 열린다)
function walkThen(tx, ty, fn) {
  if (seated !== null) standUp();
  goTo(tx, ty);
  if (!me.goal) fn();
}
$("q-scan").addEventListener("click", () => walkThen(10, 11, () => {}));
$("q-tv").addEventListener("click", () => openTV());
$("q-rank").addEventListener("click", () => openCorners());
$("q-app").addEventListener("click", () => openApps());

// 지점 고르기: 1~3호점(꽉 차면 더 열림). 사람이 적어도 원하는 지점에 들어갈 수 있다
function openRooms() {
  const box = $("room-list");
  box.innerHTML = "";
  const counts = roomCounts || { 1: null, 2: null, 3: null };
  Object.keys(counts).map(Number).sort((a, b) => a - b).forEach((n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "room-btn" + (n === room ? " on" : "");
    const c = counts[n];
    b.innerHTML = `<b>${L(`${n}호점`, `Shop #${n}`)}</b><span>${c == null ? "" : L(`손님 ${c}명`, `${c} here`)}</span>`;
    b.addEventListener("click", () => {
      $("m-rooms").hidden = true;
      if (n === room) return;
      room = n; store.set("cellfie-store-room", room);
      remotes.forEach((a) => { scene.remove(a.mesh); scene.remove(a.label); const i = pickables.indexOf(a.mesh); if (i >= 0) pickables.splice(i, 1); });
      remotes.clear();
      presence();
      toast(L(`${n}호점으로 옮겼어요`, `Moved to shop #${n}`));
    });
    box.appendChild(b);
  });
  $("m-rooms").hidden = false;
}
$("room").addEventListener("click", openRooms);

// 첫 방문 안내(한 번만)
function welcome() {
  if (store.get("cellfie-store-welcomed")) return closeDialog();
  $("m-welcome").hidden = false;
  store.set("cellfie-store-welcomed", 1);
}

// ── 모달 공통 ──
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m || e.target.closest("[data-close]")) { m.hidden = true; m.dispatchEvent(new Event("closed")); }
  });
});

// ── 측정 부스 ──
let decade = null;
const camBtn = $("cam-open"), pick = $("pick"), photo = $("photo"), consent = $("consent");
function boothReady() {
  const ok = decade !== null && consent.checked;
  camBtn.setAttribute("aria-disabled", String(!ok));
  pick.setAttribute("aria-disabled", String(!ok));
  photo.disabled = !ok;
}
document.querySelectorAll("#decades button").forEach((b) => b.addEventListener("click", () => {
  decade = Number(b.dataset.decade);
  document.querySelectorAll("#decades button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  boothReady();
}));
consent.addEventListener("change", boothReady);
const gateMsg = () => (decade === null ? L("나이대를 먼저 골라 주세요.", "Pick your age group first.") : L("동의에 체크해 주세요.", "Please tick the consent box."));
pick.addEventListener("click", (e) => { if (pick.getAttribute("aria-disabled") === "true") { e.preventDefault(); boothError(gateMsg()); } });
photo.addEventListener("change", () => {
  const file = photo.files && photo.files[0];
  photo.value = "";
  if (file) fileToJpeg(file).then(measure).catch(() => boothError(errText("invalid_image")));
});
function boothView(v) { ["start", "cam", "wait", "result"].forEach((k) => { $("booth-" + k).hidden = k !== v; }); }
function boothError(msg) { const el = $("booth-err"); el.textContent = msg || ""; el.hidden = !msg; }
function showBooth() { boothError(""); boothView("start"); $("m-booth").hidden = false; stat("booth_open"); }
// 부스에 들어가기 전에 광고 한 번. 광고가 없거나(승인 전·차단·빈도 제한) 늦으면 그냥 연다.
let adBusy = false;
function openBooth() {
  if (adBusy) return;
  if (typeof window.adBreak !== "function") return showBooth();
  adBusy = true;
  let done = false;
  const finish = () => { if (done) return; done = true; adBusy = false; showBooth(); };
  const fallback = setTimeout(finish, 2500);
  try {
    window.adBreak({
      type: "next",
      name: "before-skin-scan",
      beforeAd: () => { clearTimeout(fallback); held.clear(); },
      afterAd: () => {},
      adBreakDone: () => { clearTimeout(fallback); finish(); },
    });
  } catch (e) { clearTimeout(fallback); finish(); }
}
// 거울: 뷰티 바에서 전면 카메라로 내 얼굴을 비춰 본다. 영상은 기기 안에서만 보이고 아무 데도 보내지 않는다
let mirrorStream = null;
async function openMirror() {
  $("mirror-err").hidden = true;
  $("m-mirror").hidden = false;
  stat("mirror");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("mirror-err").textContent = L("이 브라우저는 카메라를 열 수 없어요.", "This browser can't open the camera.");
    $("mirror-err").hidden = false;
    return;
  }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    // 권한 창이 떠 있는 동안 거울을 닫았으면 카메라를 바로 끈다(숨은 채 켜져 있지 않게)
    if ($("m-mirror").hidden) { s.getTracks().forEach((t) => t.stop()); return; }
    mirrorStream = s;
    $("mirror-video").srcObject = mirrorStream;
  } catch (e) {
    $("mirror-err").textContent = e && e.name === "NotAllowedError"
      ? L("카메라 권한이 꺼져 있어요. 브라우저 설정에서 허용하면 거울로 쓸 수 있어요.", "Camera permission is off. Allow it in settings to use the mirror.")
      : L("카메라를 열지 못했어요.", "Couldn't open the camera.");
    $("mirror-err").hidden = false;
  }
}
function closeMirror() {
  if (mirrorStream) { mirrorStream.getTracks().forEach((t) => t.stop()); mirrorStream = null; }
  $("mirror-video").srcObject = null;
}
$("m-mirror").addEventListener("closed", closeMirror);
$("mirror-scan").addEventListener("click", () => { $("m-mirror").hidden = true; closeMirror(); openBooth(); });

$("m-booth").addEventListener("closed", () => {
  stopCam();
  if (skin) setTimeout(() => talkTo(npcs.find((n) => n.kind === "booth")), 60);
});

// 카메라: 화면 안에서 바로 찍는다(3초 세고 찰칵). 안 되면 사진 고르기로 안내.
let stream = null;
camBtn.addEventListener("click", async () => {
  if (camBtn.getAttribute("aria-disabled") === "true") return boothError(gateMsg());
  boothError("");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return boothError(L("이 브라우저는 카메라를 열 수 없어요. 사진 고르기로 해 주세요.", "This browser can't open the camera. Please choose a photo."));
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    if ($("m-booth").hidden) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;
    $("cam-video").srcObject = stream;
    $("cam-shot").disabled = false;
    boothView("cam");
    stat("camera_open");
  } catch (e) {
    boothError(e && e.name === "NotAllowedError"
      ? L("카메라 권한이 꺼져 있어요. 브라우저 설정에서 허용하거나 사진 고르기로 해 주세요.", "Camera permission is off. Allow it in settings or choose a photo.")
      : L("카메라를 열지 못했어요. 사진 고르기로 해 주세요.", "Couldn't open the camera. Please choose a photo."));
  }
});
function stopCam() {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  $("cam-video").srcObject = null;
  $("cam-count").textContent = "";
}
$("cam-cancel").addEventListener("click", () => { stopCam(); boothView("start"); });
$("cam-shot").addEventListener("click", async () => {
  const shot = $("cam-shot");
  shot.disabled = true;
  for (const n of [3, 2, 1]) { $("cam-count").textContent = n; await new Promise((r) => setTimeout(r, 700)); }
  $("cam-count").textContent = "";
  const v = $("cam-video");
  if (!v.videoWidth) { shot.disabled = false; return; }
  const s = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
  c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
  $("flash").classList.remove("on"); void $("flash").offsetWidth; $("flash").classList.add("on");
  stopCam();
  c.toBlob((b) => (b ? measure(b) : boothError(errText("invalid_image"))), "image/jpeg", 0.92);
});
function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("invalid_image"))), "image/jpeg", 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("invalid_image")); };
    img.src = url;
  });
}
const ERRORS = {
  no_face: ["얼굴을 찾지 못했어요. 얼굴이 가운데 크게 나오게 다시 찍어 주세요.", "No face found. Retake with your face large and centered."],
  invalid_image: ["사진을 읽지 못했어요. 다른 사진으로 해 주세요.", "We couldn't read that photo."],
  image_too_large: ["사진이 너무 커요. 다시 찍어 주세요.", "The photo is too large."],
  rate_limited: ["잠깐 쉬었다가 해 주세요. 한 시간에 할 수 있는 횟수를 넘었어요.", "Hourly limit reached. Please take a break."],
  offline: ["측정 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.", "Couldn't reach the measuring server. Please try again shortly."],
  busy: ["지금 손님이 많아요. 잠시 후 다시 해 주세요.", "It's busy right now. Please try again shortly."],
  link_not_allowed: ["링크는 붙일 수 없어요.", "Links aren't allowed."],
  personal_info: ["전화번호·이메일 같은 연락처는 붙일 수 없어요.", "Contact info isn't allowed."],
  invalid_body: ["2자 이상 200자 이하로 써 주세요.", "Write 2 to 200 characters."],
};
const errText = (code) => { const e = ERRORS[code] || ["잠시 문제가 생겼어요. 다시 해 주세요.", "Something went wrong. Please try again."]; return L(e[0], e[1]); };

let lastResult = null;
async function measure(blob) {
  boothError(""); boothView("wait");
  try {
    const form = new FormData();
    form.append("image", blob, "photo.jpg");
    form.append("decade", String(decade));
    form.append("consent", "true");
    let res;
    try { res = await fetch(API + "/web/skin-test", { method: "POST", body: form }); }
    catch (e) { throw new Error("offline"); }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || (res.status === 404 || res.status >= 500 ? "offline" : "failed"));
    lastResult = body;
    const keys = Object.keys(body.reference || {}).filter((k) => body.axes[k] != null);
    const worst = keys.length ? keys.sort((p, q) => (body.axes[p] - body.reference[p]) - (body.axes[q] - body.reference[q]))[0] : "hydration";
    skin = { age: body.skinAge, worst, zone: lang === "en" ? "r" : "d" };
    renderResult(body);
    boothView("result");
  } catch (e) {
    boothView("start");
    boothError(errText(e.message));
  }
}
const decadeLabel = (d) => L(d === 60 ? "60대 이상" : d + "대", d === 10 ? "teens" : d === 60 ? "60+" : d + "s");
function compareText(r) {
  if (r.skinAge == null) return "";
  const d = r.skinAge - (r.decade + 5);
  if (Math.abs(d) < 3) return L("딱 또래 나이의 피부예요", "Right on par with your age group");
  return L(`또래보다 ${Math.abs(d)}살 ${d < 0 ? "어린" : "많은"} 피부예요`, `${Math.abs(d)} years ${d < 0 ? "younger" : "older"} than your age group`);
}
// ── Cellfie 계정 로그인(선택) ──
// 비밀번호는 이 페이지에서 받지 않는다: 이 페이지에는 광고·CDN 스크립트가 같이 돌기 때문이다.
// 로그인은 api.cellfie.me 의 로그인 창(외부 스크립트 없음)에서 하고, 토큰은 그쪽이 HttpOnly 쿠키로만 둔다.
// 이 페이지는 토큰을 한 번도 보지 않고, 쿠키를 실어 닉네임·측정 요약만 받아 온다.
const API_ORIGIN = new URL(API).origin;
let acct = null; // { nickname, records, latestDate, latestScore }
function renderAcct() {
  const b = $("btn-acct");
  b.classList.toggle("on", !!acct);
  b.textContent = acct ? acct.nickname || L("내 계정", "Account") : L("로그인", "Log in");
  $("acct-form").hidden = !!acct;
  $("acct-in").hidden = !acct;
  if (acct) {
    $("acct-hi").textContent = L(`${acct.nickname || "Cellfie"}님, 반가워요`, `Hi, ${acct.nickname || "there"}`);
    $("acct-n").textContent = L(`${acct.records}회`, `${acct.records}`);
    $("acct-last").textContent = acct.latestScore != null ? L(`${acct.latestScore}점 · ${acct.latestDate}`, `${acct.latestScore} · ${acct.latestDate}`) : L("아직 없어요", "None yet");
  }
}
async function loadAcct() {
  try {
    const r = await fetch(`${API}/web/me`, { credentials: "include", cache: "no-store" });
    if (r.status === 401) acct = null;
    else if (r.ok) acct = await r.json();
  } catch (e) { /* 네트워크 오류면 다음 방문에 다시 본다 */ }
  renderAcct();
  if (lastResult) renderResult(lastResult);
}
$("btn-acct").addEventListener("click", () => { $("acct-err").hidden = true; renderAcct(); $("m-acct").hidden = false; stat("login_open"); });
$("acct-go").addEventListener("click", () => {
  const u = `${API}/web/login-page?lang=${lang}&origin=${encodeURIComponent(location.origin)}`;
  // 이름 없는 새 창: 이름을 재사용하면 같은 페이지의 다른 스크립트가 그 창을 다른 주소로 바꿔치기할 수 있다
  const w = window.open(u, "_blank", "popup,width=420,height=640");
  if (!w) {
    $("acct-err").textContent = L("팝업이 막혔어요. 팝업을 허용하고 다시 눌러 주세요.", "The popup was blocked. Allow popups and try again.");
    $("acct-err").hidden = false;
  }
});
// 로그인 창이 끝났다고 알려 줄 때만 다시 읽는다. 내용은 믿지 않고(토큰도 없다) 출처와 형식만 본다.
window.addEventListener("message", (e) => {
  if (e.origin !== API_ORIGIN || !e.data || e.data.type !== "cellfie-login") return;
  loadAcct().then(() => { if (acct) { stat("login"); toast(L("로그인했어요", "Logged in")); } });
});
$("acct-out").addEventListener("click", async () => {
  // 서버가 쿠키를 지웠을 때만 로그아웃으로 보인다(공용 PC 에서 "로그아웃된 줄 알았는데 남아 있는" 일을 막는다)
  let ok = false;
  try { ok = (await fetch(`${API}/web/logout`, { method: "POST", credentials: "include" })).ok; } catch (e) {}
  if (!ok) { toast(L("로그아웃하지 못했어요. 다시 눌러 주세요.", "Couldn't log out. Please try again.")); return; }
  acct = null; renderAcct();
  if (lastResult) renderResult(lastResult);
  toast(L("로그아웃했어요", "Logged out"));
});
$("acct-app").addEventListener("click", () => { $("m-acct").hidden = true; openApps(); });
$("acct-scan").addEventListener("click", () => { $("m-acct").hidden = true; walkThen(10, 11, () => {}); });
loadAcct();

function renderResult(r) {
  $("r-age").textContent = r.skinAge ?? "–";
  $("r-compare").textContent = compareText(r);
  $("r-avg").textContent = L(`${decadeLabel(r.decade)} 평균`, `${decadeLabel(r.decade)} average`);
  const p = r.percentiles && r.percentiles.score;
  const n = Number(r.peers || 0).toLocaleString();
  $("r-peers").innerHTML = p != null
    ? L(`같은 ${decadeLabel(r.decade)} 손님 <b>${n}명</b> 중 피부 점수 <b>상위 ${Math.max(1, 100 - p)}%</b>`, `Skin score <b>top ${Math.max(1, 100 - p)}%</b> among <b>${n}</b> visitors in their ${decadeLabel(r.decade)}`)
    : L(`같은 ${decadeLabel(r.decade)} 손님 중 <b>${n}번째</b> 측정이에요`, `You're visitor <b>#${n}</b> in the ${decadeLabel(r.decade)} group`);
  $("r-dark").hidden = !(r.exposure === "dim" || r.exposure === "dark");
  if (skin) {
    const tip = FOCUS_TIP[skin.worst] || FOCUS_TIP.hydration;
    $("r-focus").innerHTML = L(`관리 포인트 <b>${axisLabel(skin.worst)}</b> · 보통 ${tip[0]}을 많이 써요.`, `Focus: <b>${axisLabel(skin.worst)}</b> · people often use ${tip[1]}.`);
  }
  $("r-mine").hidden = !(acct && acct.latestScore != null);
  if (acct && acct.latestScore != null) {
    $("r-mine").textContent = L(`앱 최근 종합 점수 ${acct.latestScore}점(${acct.latestDate}). 같은 조명에서 매일 찍어야 변화가 보여요.`,
      `Your latest app score: ${acct.latestScore} (${acct.latestDate}). Shoot daily in the same light to see change.`);
  }
  const ul = $("r-bars");
  ul.innerHTML = "";
  AXES.forEach(([k]) => {
    const v = r.axes[k];
    if (v == null) return;
    const ref = r.reference && r.reference[k];
    const li = document.createElement("li");
    li.innerHTML = `<span>${axisLabel(k)}</span><span class="t"><span class="f" style="width:${v}%"></span>${ref != null ? `<span class="m" style="left:${ref}%"></span>` : ""}</span><span class="v">${v}</span>`;
    ul.appendChild(li);
  });
}
function resultCard(r) {
  const Wd = 1080, Hd = 1350;
  const c = document.createElement("canvas");
  c.width = Wd; c.height = Hd;
  const g = c.getContext("2d");
  g.fillStyle = "#F6F4EC"; g.fillRect(0, 0, Wd, Hd);
  g.fillStyle = "#4F6E25"; g.font = FONT(38); g.fillText(L("셀피 라운지 · 내 피부 나이", "Cellfie Lounge · My skin age"), 90, 150);
  g.fillStyle = "#1F2419"; g.font = FONT(250, 800);
  const age = String(r.skinAge ?? "–");
  g.fillText(age, 80, 400);
  if (lang !== "en") { const w = g.measureText(age).width; g.font = FONT(72); g.fillText("세", 96 + w, 400); }
  g.fillStyle = "#5D6556"; g.font = FONT(44, 600); g.fillText(compareText(r), 90, 490);
  let y = 600;
  AXES.forEach(([k]) => {
    const v = r.axes[k];
    if (v == null) return;
    g.fillStyle = "#5D6556"; g.font = FONT(34, 500); g.fillText(axisLabel(k), 90, y + 12);
    g.fillStyle = "#E3E5DC"; g.beginPath(); g.roundRect(300, y - 12, 560, 24, 12); g.fill();
    g.fillStyle = "#88B04B"; g.beginPath(); g.roundRect(300, y - 12, Math.max(24, 560 * v / 100), 24, 12); g.fill();
    const ref = r.reference && r.reference[k];
    if (ref != null) { g.fillStyle = "rgba(31,36,25,.6)"; g.fillRect(300 + 560 * ref / 100 - 2, y - 22, 4, 44); }
    g.fillStyle = "#1F2419"; g.font = FONT(34); g.textAlign = "right"; g.fillText(String(v), 990, y + 12); g.textAlign = "left";
    y += 72;
  });
  g.fillStyle = "#8B9187"; g.font = FONT(26, 500); g.fillText(L(`세로선 = ${decadeLabel(r.decade)} 평균`, `Line = ${decadeLabel(r.decade)} average`), 90, y + 14);
  g.fillStyle = "#1F2419"; g.font = FONT(40); g.fillText("cellfie.me/store", 90, Hd - 70);
  return new Promise((res) => c.toBlob(res, "image/png"));
}
$("r-app").addEventListener("click", () => { $("m-booth").hidden = true; stopCam(); openApps(); });
$("r-lib").addEventListener("click", () => { $("m-booth").hidden = true; stopCam(); openLibrary(skin ? skin.worst : null); });
$("r-share").addEventListener("click", async () => {
  if (!lastResult) return;
  const url = "https://cellfie.me/store/";
  const text = L(`내 피부 나이는 ${lastResult.skinAge}세. 너도 재 봐`, `My skin age is ${lastResult.skinAge}. Try yours`);
  try {
    const blob = await resultCard(lastResult);
    const file = new File([blob], "cellfie-skin-age.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text: text + " " + url });
    if (navigator.share) return await navigator.share({ text, url });
    await navigator.clipboard.writeText(text + " " + url);
    $("r-share").textContent = L("링크를 복사했어요", "Link copied");
  } catch (e) { /* 공유 창을 닫음 */ }
});

// ── 고민 게시판 ──
const ADJ = [["촉촉한", "Dewy"], ["보송한", "Fluffy"], ["말랑한", "Squishy"], ["느긋한", "Chill"], ["졸린", "Sleepy"], ["반짝이는", "Shiny"]];
const ANIMAL = [["수달", "Otter"], ["너구리", "Raccoon"], ["고슴도치", "Hedgehog"], ["다람쥐", "Squirrel"], ["펭귄", "Penguin"], ["알파카", "Alpaca"], ["판다", "Panda"]];
let me2 = store.get("cellfie-store-me") || {};
if (me2.adj == null) { me2 = { adj: Math.floor(Math.random() * ADJ.length), animal: Math.floor(Math.random() * ANIMAL.length), no: 1 + Math.floor(Math.random() * 99), mine: {}, liked: {} }; store.set("cellfie-store-me", me2); }
me2.mine = me2.mine || {}; me2.liked = me2.liked || {};
const myNick = () => `${L(ADJ[me2.adj][0], ADJ[me2.adj][1])} ${L(ANIMAL[me2.animal][0], ANIMAL[me2.animal][1])} ${me2.no}`;

let boardZone = null;
async function loadCounts() {
  await Promise.all(Object.values(ZONES).map(async (z) => {
    try {
      const r = await fetch(`${API}/web/board?zone=${z.key}`);
      if (r.ok) { boardCounts[z.key] = (await r.json()).total; drawSign(zoneByKey(z.key)); }
    } catch (e) {}
  }));
}
function ago(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return L("방금", "just now");
  if (s < 3600) return L(`${Math.floor(s / 60)}분 전`, `${Math.floor(s / 60)}m ago`);
  if (s < 86400) return L(`${Math.floor(s / 3600)}시간 전`, `${Math.floor(s / 3600)}h ago`);
  return L(`${Math.floor(s / 86400)}일 전`, `${Math.floor(s / 86400)}d ago`);
}
async function openBoard(key) {
  boardZone = key;
  const z = ZONES[zoneByKey(key)];
  $("b-title").textContent = L(z.name[0], z.name[1]);
  const link = $("b-link");
  link.hidden = !z.url;
  if (z.url) { link.href = z.url; link.textContent = L(`${z.name[0]} 바로 가기 ↗`, `Open ${z.name[1]} ↗`); link.onclick = () => stat("link_" + key); }
  $("b-nick").textContent = myNick();
  $("b-question").textContent = L(...todayQuestion(key));
  $("b-body").placeholder = L("오늘의 질문에 답하거나, 써 본 제품 후기를 짧게 남겨 주세요.", "Answer today's question, or leave a short review of something you tried.");
  $("b-err").hidden = true;
  $("m-board").hidden = false;
  stat("board_" + key);
  await renderBoard();
}
async function renderBoard() {
  const ul = $("b-list");
  ul.innerHTML = "";
  let data = { posts: [], total: 0 };
  try {
    const r = await fetch(`${API}/web/board?zone=${boardZone}`);
    if (r.ok) data = await r.json();
  } catch (e) {}
  boardCounts[boardZone] = data.total; drawSign(zoneByKey(boardZone));
  $("b-empty").hidden = data.posts.length > 0;
  data.posts.forEach((p) => {
    const li = document.createElement("li");
    const text = document.createElement("div");
    text.textContent = p.body;
    li.appendChild(text);
    const meta = document.createElement("div");
    meta.className = "meta";
    const who = document.createElement("span");
    who.textContent = `${p.nick} · ${ago(p.createdAt)}`;
    const like = document.createElement("button");
    like.type = "button";
    like.className = me2.liked[p.id] ? "on" : "";
    like.textContent = `♥ ${p.likes}`;
    like.addEventListener("click", async () => {
      if (me2.liked[p.id]) return;
      try {
        const r = await fetch(`${API}/web/board/${p.id}/like`, { method: "POST" });
        if (r.ok) { const v = await r.json(); like.textContent = `♥ ${v.likes}`; like.className = "on"; me2.liked[p.id] = 1; store.set("cellfie-store-me", me2); }
      } catch (e) {}
    });
    meta.append(who, like);
    const token = me2.mine[p.id];
    const extra = document.createElement("button");
    extra.type = "button";
    extra.textContent = token ? L("지우기", "Delete") : L("신고", "Report");
    extra.addEventListener("click", async () => {
      try {
        if (token) {
          const r = await fetch(`${API}/web/board/${p.id}`, { method: "DELETE", headers: { "X-Delete-Token": token } });
          if (r.ok) { delete me2.mine[p.id]; store.set("cellfie-store-me", me2); renderBoard(); }
        } else {
          await fetch(`${API}/web/board/${p.id}/report`, { method: "POST" });
          extra.textContent = L("신고함", "Reported"); extra.disabled = true;
        }
      } catch (e) {}
    });
    meta.append(extra);
    li.appendChild(meta);
    ul.appendChild(li);
  });
}
$("b-body").addEventListener("input", () => { $("b-len").textContent = `${[...$("b-body").value].length}/200`; });
$("b-send").addEventListener("click", async () => {
  const body = $("b-body").value.trim();
  const err = $("b-err");
  err.hidden = true;
  if ([...body].length < 2) { err.textContent = errText("invalid_body"); err.hidden = false; return; }
  $("b-send").disabled = true;
  try {
    const r = await fetch(`${API}/web/board`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zone: boardZone, nick: myNick(), body }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "failed");
    me2.mine[data.post.id] = data.deleteToken; store.set("cellfie-store-me", me2);
    $("b-body").value = ""; $("b-len").textContent = "0/200";
    await renderBoard();
  } catch (e) {
    err.textContent = e.message === "rate_limited" ? L("너무 많이 썼어요. 잠깐 쉬었다가 써 주세요.", "Too many notes. Please wait a bit.") : errText(e.message);
    err.hidden = false;
  } finally { $("b-send").disabled = false; }
});

// ── 언어·시작 ──
function setLang(l) {
  lang = l; root.dataset.lang = l; root.lang = l;
  document.querySelectorAll("[data-content-en]").forEach((el) => {
    if (!el.hasAttribute("data-content-ko")) el.setAttribute("data-content-ko", el.getAttribute("content") || "");
    el.setAttribute("content", l === "en" ? el.dataset.contentEn : el.dataset.contentKo);
  });
  document.title = L("피부 나이 테스트 · 올리브영 화해 아마존 랭킹 한곳에 | 셀피 라운지", "Skin Age Test · Beauty Rankings in One Place | Cellfie Lounge");
  $("btn-lang").textContent = l === "en" ? "KR" : "EN";
  try { localStorage.setItem("cellfie-lang", l); } catch (e) {}
  Object.keys(zoneTiles).forEach(drawSign);
  paintLibPlate();
  if (TV.screen) paintTV();
  updateHud();
  if (!dlg.open) closeDialog();
  if (lastResult) renderResult(lastResult);
  renderAcct();
}
$("btn-lang").addEventListener("click", () => setLang(lang === "en" ? "ko" : "en"));
let savedLang = null;
try { savedLang = localStorage.getItem("cellfie-lang"); } catch (e) {}
savedLang = savedLang && savedLang.replace(/"/g, "");
setLang(savedLang === "en" || savedLang === "ko" ? savedLang : ((navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en"));
boothReady();
resize();
requestAnimationFrame(frame);
stat("visit");
// 하루 한 번만 "방문자"로 센다(같은 브라우저가 여러 번 열어도 1명)
{
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  if (store.get("cellfie-store-visited") !== today) { stat("visitor"); store.set("cellfie-store-visited", today); }
}
loadCounts();
presence();
paintMaskTime();
setTimeout(welcome, 500);
