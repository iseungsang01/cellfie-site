// Cellfie 피부 상점(3D). 정적 파일로 도는 1인용 가게이고, 서버는 세 군데에서만 부른다:
// 측정 부스(/web/skin-test), 고민 게시판(/web/board), 익명 횟수(/web/stat).
// 사진·점수는 어디에도 저장하지 않는다. 브라우저에는 언어·자동 닉네임·내 글 삭제 토큰만 둔다.
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
// # 벽 · . 바닥 · D 출입문 · M 측정 부스 · T 테스터 · S 라운지 소파 · C 커피 테이블 · P 화분 · V 뷰티 TV · B 앱 책장
// 코너 선반: d 올리브영 랭킹 · r 아마존 스킨케어 · l 화해 랭킹 · g 올리브영 글로벌 · a 아마존 뷰티 · o 인생템
const MAP = [
  "###############",
  "#VV.ddddd.rrrr#",
  "#.............#",
  "#.............#",
  "#.llll...gggg.#",
  "#.............#",
  "#a...TTTTT...o#",
  "#a...........o#",
  "#a...........o#",
  "#......MM.....#",
  "#S.....MM...P.#",
  "#S.C.........B#",
  "#S...........B#",
  "######DDD######",
];
const W = MAP[0].length, H = MAP.length;
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
scene.background = new THREE.Color("#F1EADB");
scene.fog = new THREE.Fog("#F1EADB", 18, 34);
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

// 바닥: 밝은 원목 마루
{
  const tex = textTexture((g, w, h) => {
    const plank = 32;
    for (let row = 0; row * plank < h; row++) {
      let x = -((row * 97) % 160);
      while (x < w) {
        const len = 120 + ((row * 31 + x) % 90);
        const tone = 228 + ((row * 13 + Math.floor(x / 7)) % 14);
        g.fillStyle = `rgb(${tone + 8},${tone - 4},${tone - 26})`;
        g.fillRect(x, row * plank, len, plank);
        g.fillStyle = "rgba(120,90,60,.10)";
        g.fillRect(x, row * plank, 2, plank);
        x += len;
      }
      g.fillStyle = "rgba(120,90,60,.12)";
      g.fillRect(0, row * plank + plank - 2, w, 2);
    }
  }, (W - 2) * 64, (H - 2) * 64);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, H - 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, H / 2);
  floor.receiveShadow = true;
  floor.userData.floor = true;
  scene.add(floor);
  // 바깥 바닥(문 밖)
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(W + 20, 20), mat("#DCD5C5"));
  outside.rotation.x = -Math.PI / 2;
  outside.position.set(W / 2, -0.01, H / 2);
  outside.receiveShadow = true;
  scene.add(outside);
}

// 벽: 뒤와 양옆은 높게, 앞은 낮게(카메라가 안을 내려다보도록)
{
  const wallC = "#F3EEE6";
  const back = box(W, 2.8, 0.3, wallC, 0); back.position.set(W / 2, 1.4, 0.85); scene.add(back);
  const left = box(0.3, 2.8, H - 1, wallC, 0); left.position.set(0.85, 1.4, H / 2 - 0.5); scene.add(left);
  const right = box(0.3, 2.8, H - 1, wallC, 0); right.position.set(W - 0.85, 1.4, H / 2 - 0.5); scene.add(right);
  const base = mat("#C9B9A0");
  [[W / 2, 0.06, 1.02, W, 0.12, 0.05], [1.02, 0.06, H / 2 - 0.5, 0.05, 0.12, H - 1], [W - 1.02, 0.06, H / 2 - 0.5, 0.05, 0.12, H - 1]]
    .forEach(([x, y, z, w, h, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), base); m.position.set(x, y, z); scene.add(m); });
  const frontL = box(5.2, 0.4, 0.3, wallC, 0); frontL.position.set(0.7 + 2.6, 0.2, H - 0.85); scene.add(frontL);
  const frontR = box(5.2, 0.4, 0.3, wallC, 0); frontR.position.set(W - 3.3, 0.2, H - 0.85); scene.add(frontR);
  // 출입문: 시야를 가리지 않게 문틀 없이 매트만 깐다
  const matt = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), mat("#7E8B72"));
  matt.rotation.x = -Math.PI / 2; matt.position.set(7.5, 0.006, H - 0.75); matt.receiveShadow = true; scene.add(matt);
  for (let x = 6; x <= 8; x++) tagTile(matt, x, H - 1);
  // 뒤 벽 간판
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({
    map: textTexture((g, w, h) => {
      g.fillStyle = "#88B04B"; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
      g.fillStyle = "#fff"; g.font = FONT(110, 800); g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("Cellfie", w / 2, h / 2 + 6);
    }, 640, 160), transparent: true }));
  sign.position.set(W / 2, 2.35, 1.01);
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
function makeShelf(x, y, z) {
  const g = new THREE.Group();
  const color = ZONES[z].color;
  // 속이 빈 틀: 뒤판·양옆·지붕·받침(통짜 상자면 상품이 안에 묻힌다)
  [[0.94, 1.6, 0.04, 0, 0.8, -0.26, "#8F6A4A"], [0.04, 1.6, 0.56, -0.45, 0.8, 0, "#B98E66"], [0.04, 1.6, 0.56, 0.45, 0.8, 0, "#B98E66"],
    [0.94, 0.05, 0.56, 0, 1.6, 0, "#B98E66"], [0.94, 0.12, 0.56, 0, 0.06, 0, "#A57A52"]].forEach(([w, h, d, x, y, z, c]) => {
    const m = box(w, h, d, c, 0.01); m.position.set(x, y, z); g.add(m);
  });
  for (let lv = 0; lv < 3; lv++) {
    const yy = 0.32 + lv * 0.44;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.035, 0.5), mat("#D6B48D")); plank.position.set(0, yy, 0.02); plank.receiveShadow = true; g.add(plank);
    for (let k = 0; k < 5; k++) {
      const seed = (x * 13 + y * 7 + lv * 5 + k * 11) % 17;
      const hgt = 0.16 + (seed % 4) * 0.04;
      const bottle = seed % 3 === 0;
      const m = new THREE.Mesh(bottle ? bottleGeo : productGeo, mat(shade(color, ((seed % 5) - 2) * 0.06)));
      m.scale.y = hgt;
      m.position.set(-0.32 + k * 0.16, yy + 0.02 + hgt / 2, 0.08);
      m.castShadow = true;
      g.add(m);
      if (seed % 4 === 1) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), mat("#FFFFFF")); cap.position.set(m.position.x, yy + 0.02 + hgt + 0.025, 0.08); g.add(cap); }
    }
  }
  // 자리: 위쪽 벽 선반은 벽에 붙이고, 왼쪽·오른쪽 기둥 선반은 안쪽을 보게 돌린다
  if (x === 1) { g.rotation.y = Math.PI / 2; g.position.set(cx(x) - 0.18, 0, cz(y)); }
  else if (x === W - 2) { g.rotation.y = -Math.PI / 2; g.position.set(cx(x) + 0.18, 0, cz(y)); }
  else g.position.set(cx(x), 0, cz(y) - (y === 1 ? 0.18 : 0));
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
  const tex = textTexture((g, w, h) => {
    g.fillStyle = zone.color; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.fill();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    const label = L(zone.name[0], zone.name[1]);
    let px = 56;
    do { g.font = FONT(px, 800); px -= 2; } while (g.measureText(label).width > w - 40 && px > 24);
    g.fillText(label, w / 2, n != null ? 58 : h / 2 + 4);
    if (n != null) { g.font = FONT(34, 600); g.fillText(L(`이야기 ${n}`, `${n} notes`), w / 2, 118); }
  }, 420, 160);
  if (signs[z]) { signs[z].material.map.dispose(); signs[z].material.map = tex; signs[z].material.needsUpdate = true; return; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const tiles = zoneTiles[z];
  const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
  // 옆 벽 선반의 표지판은 벽에 묻히지 않게 안쪽으로 당긴다
  const side = xs.every((x) => x === 1) ? 0.7 : xs.every((x) => x === W - 2) ? -0.7 : 0;
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5 + side, mz = (Math.min(...ys) + Math.max(...ys)) / 2 + 0.5;
  s.scale.set(1.4, 0.53, 1);
  s.position.set(mx, tiles.length > 3 && ys[0] === ys[ys.length - 1] ? 2.1 : 2.15, ys[0] === 1 ? 1.3 : mz);
  s.renderOrder = 2;
  signs[z] = s;
  scene.add(s);
}
Object.keys(zoneTiles).forEach(drawSign);

// 테스터 테이블
{
  const t = box(4.8, 0.78, 0.8, "#FFFFFF", 0.06); t.position.set(7.5, 0.39, 6.5); scene.add(t);
  const cols = ["#E57A9C", "#5FA8DC", "#EE9A45", "#4FB3A5", "#9A7FD1"];
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(bottleGeo, mat(cols[i % cols.length]));
    const h = 0.18 + (i % 3) * 0.05;
    b.scale.y = h; b.position.set(5.5 + i * 0.36, 0.78 + h / 2, 6.5 + (i % 2 ? 0.15 : -0.15)); b.castShadow = true; scene.add(b);
  }
  for (let x = 5; x <= 9; x++) tagTile(t, x, 6);
  t.userData.tile = [7, 6];
}

// 라운지: 소파에 앉아 쉬는 자리(산사의 방석 같은 곳)
{
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 40), mat("#E9C9A6"));
  rug.rotation.x = -Math.PI / 2; rug.position.set(2.6, 0.006, 11.5); rug.receiveShadow = true; scene.add(rug);
  const sofaBase = box(0.9, 0.42, 3, "#6E9C8A", 0.12); sofaBase.position.set(1.55, 0.21, 11.5); scene.add(sofaBase);
  const sofaBack = box(0.28, 0.6, 3, "#5F8C7B", 0.12); sofaBack.position.set(1.18, 0.62, 11.5); scene.add(sofaBack);
  [10.15, 12.85].forEach((z) => { const arm = box(0.9, 0.55, 0.26, "#5F8C7B", 0.1); arm.position.set(1.55, 0.36, z); scene.add(arm); });
  [10.55, 11.5, 12.45].forEach((z, i) => { const c = box(0.62, 0.14, 0.82, ["#F2C14E", "#F3E9DA", "#E57A9C"][i], 0.06); c.position.set(1.6, 0.48, z); scene.add(c); });
  for (let y = 10; y <= 12; y++) { const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(1.5, 0.5, cz(y)); tagTile(hit, 1, y); scene.add(hit); }
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 28), mat("#C99B6D")); table.position.set(cx(3), 0.45, cz(11)); table.castShadow = true; scene.add(table);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.42, 12), mat("#A57A52")); leg.position.set(cx(3), 0.21, cz(11)); scene.add(leg);
  tagTile(table, 3, 11);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 16), mat("#FFFFFF")); cup.position.set(cx(3) + 0.12, 0.55, cz(11)); scene.add(cup);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), mat("#6B4A33")); coffee.rotation.x = -Math.PI / 2; coffee.position.set(cx(3) + 0.12, 0.617, cz(11)); scene.add(coffee);
  const bookA = box(0.28, 0.05, 0.2, "#5FA8DC", 0.01); bookA.position.set(cx(3) - 0.12, 0.505, cz(11) - 0.05); scene.add(bookA);
  // 스탠드 조명(따뜻한 빛)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), mat("#3B3B3B")); pole.position.set(1.4, 0.85, 9.4); scene.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#FFE7B8", emissive: "#FFC870", emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  shade.position.set(1.4, 1.75, 9.4); scene.add(shade);
  const warm = new THREE.PointLight("#FFC27A", 3.2, 5, 1.6); warm.position.set(1.6, 1.6, 10.2); scene.add(warm);
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
  [[1.01, 4.5, Math.PI / 2], [1.01, 9.0, Math.PI / 2], [W - 1.01, 4.5, -Math.PI / 2], [W - 1.01, 9.0, -Math.PI / 2]].forEach(([x, z, ry]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.1), winMat);
    w.position.set(x, 2.15, z); w.rotation.y = ry; scene.add(w);
  });
}

// 측정 부스(2×2): 입구 바로 앞 가운데
const BX = 8, BZ = 10;
let scanLine = null;
{
  const b = box(1.86, 2.3, 1.86, "#F5F7F3", 0.14); b.position.set(BX, 1.15, BZ);
  b.traverse((o) => { o.userData.tile = [7, 9]; });
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
  screen.userData.tile = [7, 9];
  // 화면 위를 오르내리는 스캔선
  scanLine = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.03), new THREE.MeshBasicMaterial({ color: "#7BE08A", transparent: true, opacity: 0.9 }));
  scanLine.position.set(BX, 1.42, BZ + 0.95);
  scene.add(scanLine);
  pickables.push(screen);
  scene.add(screen);
}

// 뷰티 TV: 뒤 벽 왼쪽. 화면에 유튜버 이름이 돌아가며 나온다
const TV = { x: 2, z: 1.25, tex: null, i: 0 };
{
  const stand = box(1.9, 0.5, 0.5, "#C9A27A", 0.04); stand.position.set(TV.x, 0.25, TV.z + 0.05); scene.add(stand);
  const frame = box(1.85, 1.1, 0.08, "#1F2326", 0.03); frame.position.set(TV.x, 1.45, TV.z - 0.12); scene.add(frame);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.97), new THREE.MeshBasicMaterial({ color: "#FFFFFF" }));
  scr.position.set(TV.x, 1.45, TV.z - 0.075); scene.add(scr);
  TV.screen = scr;
  [stand, frame, scr].forEach((m) => tagTile(m, 1, 1));
}
// 앱 책장: 오른쪽 벽 아래. 앱 상자 두 개와 책
{
  const bx = W - 1.62, bz = 12;
  // 속이 빈 틀(통짜 상자면 책이 안에 묻힌다): 양옆·지붕·받침
  [[0.5, 1.9, 0.05, bx + 0.05, 0.95, bz - 0.93], [0.5, 1.9, 0.05, bx + 0.05, 0.95, bz + 0.93], [0.5, 0.05, 1.9, bx + 0.05, 1.9, bz], [0.5, 0.1, 1.9, bx + 0.05, 0.05, bz]]
    .forEach(([w, h, dd, x, y, z]) => { const m = box(w, h, dd, "#B98E66", 0.01); m.position.set(x, y, z); scene.add(m); });
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.7, 1.75), mat("#8F6A4A")); back.position.set(bx + 0.28, 1.0, bz); scene.add(back);
  const cols = ["#E25D4F", "#5FA8DC", "#F2C14E", "#88B04B", "#9A7FD1", "#F08A5D", "#4FB3A5"];
  for (let lv = 0; lv < 3; lv++) {
    const y = 0.25 + lv * 0.55;
    const plankM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 1.8), mat("#D6B48D")); plankM.position.set(bx, y, bz); scene.add(plankM);
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
  for (let y = 11; y <= 12; y++) { const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(cx(W - 2), 1, cz(y)); tagTile(hit, W - 2, y); scene.add(hit); }
}

// 화분
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === "P") {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.4, 16), mat("#C77B57")); pot.position.set(cx(x), 0.2, cz(y)); pot.castShadow = true;
  scene.add(pot); tagTile(pot, x, y);
  [[0, 0.75, 0, 0.3], [0.18, 0.6, 0.1, 0.22], [-0.17, 0.62, -0.06, 0.22], [0.02, 0.98, 0.05, 0.2]].forEach(([dx, dy, dz, r]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat("#5E9A48")); leaf.position.set(cx(x) + dx, dy, cz(y) + dz); leaf.castShadow = true; scene.add(leaf);
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
const me = mkActor(7, 12, lookPalette(myLook), { dir: "up", path: [], goal: null });
me.yaw = Math.PI;
const npcs = [
  mkActor(9, 10, "staff2", { kind: "booth", dir: "down", name: ["측정 매니저", "Booth staff"] }),
  mkActor(6, 9, "s1", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["인생템 코너에 붙은 메모 보고 하나 샀어요.", "I bought something after reading the favorites board."],
    ["테스터 다 발라 봤더니 손등이 반짝반짝해요.", "I tried every tester. My hand is so shiny now."]] }),
  mkActor(10, 5, "s2", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["측정 부스 해 봤어요? 저는 생각보다 어리게 나왔어요.", "Tried the booth? Mine came out younger than I thought."],
    ["레티놀이랑 AHA 는 같은 날 밤에 같이 쓰면 자극이 세대요.", "Retinol and AHA on the same night can be harsh."]] }),
  mkActor(12, 9, "s3", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["올리브영 랭킹 코너 누르면 랭킹이 바로 열려요.", "Tap the Olive Young corner and the ranking opens right away."],
    ["제품은 하나씩 바꿔 봐야 뭐가 맞는지 알더라고요.", "Change one product at a time to know what works."]] }),
  mkActor(4, 5, "s4", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["아마존 랭킹 코너 눌러 보니 미국은 여드름 패치를 엄청 사더라고요.", "Checked the Amazon corner. Pimple patches are huge in the US."]] }),
  mkActor(11, 3, "s5", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["화해 랭킹이랑 올영 랭킹이 은근 달라요.", "The Hwahae and Olive Young rankings are kind of different."]] }),
  mkActor(3, 8, "s6", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["SKIN SCAN 은 밝은 데서 찍어야 잘 나온대요.", "They say SKIN SCAN works best in bright light."]] }),
  mkActor(10, 12, "s7", { kind: "shopper", wander: true, name: ["손님", "Shopper"], lines: [
    ["친구랑 피부 나이 내기했는데 제가 졌어요.", "My friend and I compared skin ages. I lost."]] }),
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
let guide = null;
let skin = null;
function closeDialog() {
  dlg.open = false;
  $("dialog").classList.add("idle");
  $("dlg-who").textContent = "";
  $("dlg-choices").innerHTML = "";
  $("dlg-text").textContent = skin && guide
    ? L(`빨간 표시가 있는 곳이 ${ieyo(ZONES[guide].name[0])}. 관리 포인트(${axisLabel(skin.worst)}) 제품을 찾아보세요.`, `The red marker is ${ZONES[guide].name[1]}. Look for ${axisLabel(skin.worst).toLowerCase()} products there.`)
    : L("바닥을 눌러 걷고, 선반이나 사람을 누르면 말을 걸어요.", "Tap the floor to walk. Tap shelves or people to interact.");
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
  if (ch === "T") {
    const n = (store.get("cellfie-store-tester") || 0) + 1;
    store.set("cellfie-store-tester", n);
    return say(L("테스터", "Testers"), [L(`${["손등에 발라 봤다. 끈적임 없이 쏙 스며든다.", "손등에 톡톡. 향이 은은하다.", "손등이 벌써 반짝반짝하다."][n % 3]}\n(지금까지 테스터 ${n}번)`, `You try a tester on your hand.\n(${n} testers so far)`)]);
  }
  if (ch === "D") return say("", [L("상점을 나갈까요?", "Leave the shop?")], [[L("cellfie.me 홈으로", "Go to cellfie.me"), () => { location.href = "../"; }], [L("더 둘러보기", "Stay"), null]]);
  if (ch === "V") return openTV();
  if (ch === "B") return openApps();
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
      const z = ZONES[skin.zone];
      return say(who, [
        L(`피부 나이 ${skin.age}세로 나왔어요. 관리 포인트는 ${ieyo(axisLabel(skin.worst))}.`, `Your skin age is ${skin.age}. Your focus is ${axisLabel(skin.worst)}.`),
        L(`${axisLabel(skin.worst)} 제품은 ${z.name[0]} 코너에서 찾아보세요. 빨간 표시를 따라가면 돼요.`, `Look for ${axisLabel(skin.worst).toLowerCase()} products at the ${z.name[1]} corner. Follow the red marker.`)],
        [[L("다시 측정하기", "Measure again"), openBooth], [L("괜찮아요", "I'm good"), () => { guide = skin.zone; closeDialog(); }]]);
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
  const taken = [...remotes.values()].find((r) => r.seat === y - 10);
  if (taken) return say("", [L(`${taken.nick} 님이 앉아 있어요. 다른 자리에 앉아 보세요.`, `${taken.nick} is sitting there. Try another seat.`)]);
  seated = y;
  me.path = []; me.goal = null;
  me.dir = "right";
  sitStart = performance.now();
  $("dialog").classList.add("idle");
  $("dlg-who").textContent = "";
  $("dlg-choices").innerHTML = "";
  $("dlg-text").textContent = L("소파에 앉아 쉬는 중… 화면 아무 데나 누르면 일어나요.", "Resting on the sofa… tap anywhere to stand up.");
  stat("sit");
}
let sitStart = 0;
function standUp() { seated = null; closeDialog(); }

// ── 입력: 누른 곳으로 걸어간다 ──
function goTo(tx, ty, npc) {
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
  const near = Math.abs(me.x - 7.5) + Math.abs(me.y - 9.5) <= 3 ? L("측정 부스", "Skin booth")
    : Math.abs(me.x - 1.5) + Math.abs(me.y - 1) <= 2 ? L("뷰티 TV", "Beauty TV")
    : Math.abs(me.x - 13) + Math.abs(me.y - 11.5) <= 2 ? L("앱 책장", "App shelf") : null;
  $("zone").textContent = near || (zone ? L(`${ZONES[zone].name[0]} 구역`, ZONES[zone].name[1]) : L("Cellfie 피부 상점", "Cellfie Skin Shop"));
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

// 천장 가랜드: 알록달록한 삼각 깃발 줄
{
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.26, 0], 3));
  flagGeo.computeVertexNormals();
  const cols = ["#E25D4F", "#EE9A45", "#F2C14E", "#88B04B", "#4FB3A5", "#5FA8DC", "#9A7FD1", "#E57A9C"];
  [3.2, 7.4].forEach((z, row) => {
    for (let i = 0; i < 26; i++) {
      const x = 1.3 + i * 0.5;
      const sag = 0.25 * Math.sin((i / 25) * Math.PI);
      const f = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: cols[(i + row * 3) % cols.length], side: THREE.DoubleSide, roughness: 0.7 }));
      f.position.set(x, 2.9 - sag, z);
      f.userData.sway = i * 0.7 + row;
      flags.push(f);
      scene.add(f);
    }
  });
}

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
    const seatY = a === me ? seated : (a.remote && a.seat >= 0 ? 10 + a.seat : null);
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
  flags.forEach((f) => { f.rotation.x = Math.sin(now / 700 + f.userData.sway) * 0.25; });
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

  // 카메라는 나를 부드럽게 따라온다(가로 화면이면 조금 더 멀리)
  const wide = canvas.clientWidth > canvas.clientHeight;
  const tx = Math.max(4.5, Math.min(W - 4.5, me.mesh.position.x));
  const tz = Math.max(3.5, Math.min(H - 2.5, me.mesh.position.z));
  camTarget.lerp(new THREE.Vector3(tx, 0, tz), 1 - Math.exp(-dt * 0.004));
  const off = seated !== null ? [2.2, 4.2, 5.2] : wide ? [0, 8.5, 8.2] : [0, 9.5, 8.6];
  camPos.lerp(new THREE.Vector3(camTarget.x + off[0], off[1], camTarget.z + off[2]), 1 - Math.exp(-dt * 0.003));
  camera.position.copy(camPos);
  camera.lookAt(camTarget.x, 0.4, camTarget.z - 0.6);
  renderer.render(scene, camera);
}
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w > h ? 38 : 44;
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
let roomHere = 0, onlineAll = 0;
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
      id: clientId, room: room || null, nick: myNick(), look: myLook, x: me.x, y: me.y, dir: me.dir, seat: seated !== null ? seated - 10 : -1, mask: myMask }) });
    if (!r.ok) return;
    const st = await r.json();
    room = st.room; roomHere = st.here; onlineAll = st.online;
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
    const { h, m } = kstNow();
    const left = ((22 * 60) - (h * 60 + m) + 1440) % 1440;
    el.hidden = false;
    $("mt-text").textContent = L(`밤 10시 마스크팩 타임까지 ${Math.floor(left / 60)}시간 ${left % 60}분`, `Sheet mask time at 10 PM KST in ${Math.floor(left / 60)}h ${left % 60}m`);
    $("mt-btn").textContent = "";
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
      const go = document.createElement("a"); go.href = z.url; go.target = "_blank"; go.rel = "noopener"; go.textContent = L("랭킹 ↗", "Ranking ↗");
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
$("q-scan").addEventListener("click", () => walkThen(7, 9, () => {}));
$("q-tv").addEventListener("click", () => openTV());
$("q-rank").addEventListener("click", () => openCorners());
$("q-app").addEventListener("click", () => openApps());

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
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
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
    guide = skin.zone;
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
  g.fillStyle = "#4F6E25"; g.font = FONT(38); g.fillText(L("Cellfie 피부 상점 · 내 피부 나이", "Cellfie Skin Shop · My skin age"), 90, 150);
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
  document.title = L("피부 나이 테스트 · 올리브영 화해 아마존 랭킹 한곳에 | Cellfie 피부 상점", "Skin Age Test · Beauty Rankings in One Place | Cellfie Skin Shop");
  $("btn-lang").textContent = l === "en" ? "KR" : "EN";
  try { localStorage.setItem("cellfie-lang", l); } catch (e) {}
  Object.keys(zoneTiles).forEach(drawSign);
  updateHud();
  if (!dlg.open) closeDialog();
  if (lastResult) renderResult(lastResult);
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
