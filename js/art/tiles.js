'use strict';
// Тайлы 16×16, генерируются кодом с фиксированным зерном — картинка одинакова при каждом запуске.

(function buildTiles() {
  const T = Art.tiles, R = mulberry32(1337), spr = Art.spr;
  const tile = (fn) => { const c = makeCanvas(TS, TS), x = c.getContext('2d'); fn(x); return c; };
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const speckle = (x, base, cols, n) => {
    x.fillStyle = base; x.fillRect(0, 0, TS, TS);
    for (let i = 0; i < n; i++) px(x, (R() * TS) | 0, (R() * TS) | 0, cols[(R() * cols.length) | 0]);
  };
  T.void = tile(x => { x.fillStyle = '#07060a'; x.fillRect(0, 0, TS, TS); });

  // ---------- Лес ----------
  const grass = (x) => {
    speckle(x, '#2f4a2c', ['#27402a', '#365a33', '#2a4428'], 40);
    for (let i = 0; i < 4; i++) { const X = (R() * 14) | 0, Y = 2 + (R() * 13) | 0; px(x, X, Y, '#44703e'); px(x, X, Y - 1, '#3a6035'); }
  };
  T.grass = [tile(grass), tile(grass), tile(grass)];
  T.flowers = tile(x => { grass(x); for (let i = 0; i < 3; i++) px(x, 2 + (R() * 12) | 0, 2 + (R() * 12) | 0, i % 2 ? '#d8c060' : '#b070c0'); });
  const dirt = (x) => speckle(x, '#5e4630', ['#6e5438', '#4e3a28', '#735a40'], 50);
  T.dirt = [tile(dirt), tile(dirt)];
  const treeTop = (x, v) => {
    x.fillStyle = '#3a2618'; x.fillRect(6, 11, 4, 5);
    const dark = ['#12241a', '#142a1c', '#10201a'][v], mid = ['#1e3a24', '#23402a', '#1a3422'][v];
    x.fillStyle = dark; x.beginPath(); x.arc(8, 7, 7.5, 0, 7); x.fill();
    x.fillStyle = mid; x.beginPath(); x.arc(7.5, 6.5, 6, 0, 7); x.fill();
    x.fillStyle = '#2c5230'; x.beginPath(); x.arc(6.5, 5, 3.5, 0, 7); x.fill();
    for (let i = 0; i < 5; i++) px(x, 3 + (R() * 8) | 0, 2 + (R() * 7) | 0, '#3f6e3e');
  };
  T.tree = [0, 1, 2].map(v => tile(x => { grass(x); treeTop(x, v); }));
  T.bushTile = [tile(x => { grass(x); x.drawImage(spr.bush, 2, 6); }), tile(x => { grass(x); x.drawImage(spr.bush, 1, 5); x.fillStyle = '#b01838'; x.fillRect(5, 8, 1, 1); x.fillRect(9, 10, 1, 1); })];
  T.boulderTile = tile(x => { grass(x); x.drawImage(spr.boulder, 0, 2); });
  T.log = tile(x => {
    grass(x);
    x.fillStyle = '#3a2618'; x.fillRect(0, 7, 16, 7); x.fillStyle = '#5a3a22'; x.fillRect(0, 7, 16, 2);
    x.fillStyle = '#2a1a10'; x.fillRect(0, 12, 16, 2); x.fillStyle = '#4a6a3a'; x.fillRect(3, 6, 3, 1); x.fillRect(11, 6, 2, 1);
  });
  // Завал: брёвна крест-накрест и сучья — видно издалека, что прохода нет
  T.barricade = [0, 1].map(v => tile(x => {
    grass(x);
    const logs = v ? [[0, 3, 16, 4], [1, 9, 15, 4]] : [[0, 5, 16, 4], [0, 11, 14, 4]];
    for (const [X, Y, w, h] of logs) {
      x.fillStyle = '#2e1c10'; x.fillRect(X, Y, w, h);
      x.fillStyle = '#6a4424'; x.fillRect(X, Y, w, 1);
      x.fillStyle = '#4a2e18'; x.fillRect(X + 1, Y + 1, w - 2, h - 2);
      x.fillStyle = '#8a6a44'; x.fillRect(X + (v ? w - 3 : 1), Y + 1, 2, h - 2);
    }
    x.strokeStyle = '#3a2412'; x.beginPath(); x.moveTo(2, 15); x.lineTo(13, 1); x.moveTo(4, 1); x.lineTo(15, 14); x.stroke();
    for (let i = 0; i < 6; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#1e3a24');
  }));
  T.pebbles = tile(x => { grass(x); for (let i = 0; i < 4; i++) { const X = 2 + (R() * 11) | 0, Y = 3 + (R() * 10) | 0; x.fillStyle = '#6a6a66'; x.fillRect(X, Y, 2, 1); x.fillStyle = '#9a9a94'; x.fillRect(X, Y - 1, 1, 1); } });
  T.cliff = tile(x => {
    speckle(x, '#4a4a50', ['#5a5a60', '#3a3a40', '#626268'], 50);
    x.fillStyle = '#2e2e34'; x.fillRect(0, 15, 16, 1); x.fillRect(0, 7, 16, 1); x.fillRect(5, 0, 1, 7); x.fillRect(11, 8, 1, 7);
  });
  T.water = [0, 1].map(f => tile(x => {
    speckle(x, '#1e3c5a', ['#244666', '#1a3450'], 30);
    for (let i = 0; i < 3; i++) { x.fillStyle = f ? '#5a8ab0' : '#3e6a90'; x.fillRect((R() * 12) | 0, (R() * 15) | 0, 3, 1); }
  }));
  T.hutRoof = tile(x => {
    x.fillStyle = '#6a5a30'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 3) { x.fillStyle = '#4a3a20'; x.fillRect(0, yy + 2, 16, 1); for (let i = 0; i < 5; i++) px(x, (R() * 16) | 0, yy + ((R() * 2) | 0), '#8a7a48'); }
  });
  T.hutWall = tile(x => {
    x.fillStyle = '#4a3220'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) { x.fillStyle = '#6a4a2c'; x.fillRect(0, yy, 16, 3); x.fillStyle = '#2a1a10'; x.fillRect(0, yy + 3, 16, 1); }
  });
  T.roadRut = tile(x => {
    speckle(x, '#6a5a44', ['#7a6a50', '#5a4a38', '#806e54'], 45);
    x.fillStyle = '#4e4030'; x.fillRect(0, 3, 16, 2); x.fillRect(0, 11, 16, 2);
    for (let i = 0; i < 5; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#8a7a60');
  });
  const fenceOn = (x, ground) => {
    ground(x); x.fillStyle = '#5a3e24'; x.fillRect(0, 6, 16, 2); x.fillRect(0, 11, 16, 2);
    for (let i = 1; i < 16; i += 5) { x.fillStyle = '#6a4a2c'; x.fillRect(i, 3, 3, 12); x.fillStyle = '#3a2614'; x.fillRect(i + 2, 3, 1, 12); }
  };
  T.fenceWood = tile(x => fenceOn(x, grass));

  // ---------- Трущобы и город ----------
  const mud = (x) => speckle(x, '#4a3e34', ['#55483c', '#3e342c', '#5c4e40', '#3a3a30'], 45);
  T.mud = [tile(mud), tile(mud), tile(x => { mud(x); x.fillStyle = '#3a3228'; x.fillRect((R() * 10) | 0, (R() * 12) | 0, 5, 2); })];
  T.cobble = [0, 1].map(() => tile(x => {
    x.fillStyle = '#3a3634'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) for (let xx = (yy / 4) % 2 * 2; xx < 16; xx += 4) {
      x.fillStyle = ['#6a625a', '#5a544e', '#726a60'][(R() * 3) | 0]; x.fillRect(xx, yy, 3, 3);
    }
  }));
  const roofCols = [['#553a2c', '#4a3228', '#6a4a38'], ['#3e4450', '#363b46', '#565c6a'], ['#5a2e2a', '#4e2824', '#743e38'], ['#4a4a36', '#40402e', '#626248']];
  T.roof = roofCols.map(([a, b, hi]) => [a, b].map(base => tile(x => {
    x.fillStyle = base; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) { x.fillStyle = '#1e1612'; x.fillRect(0, yy + 3, 16, 1); for (let xx = (yy / 4) % 2 * 4; xx < 16; xx += 8) x.fillRect(xx, yy, 1, 3); }
    for (let i = 0; i < 6; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, hi);
  })));
  T.wallFront = [0, 1].map(v => tile(x => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 16, 16);
    for (let xx = 0; xx < 16; xx += 4) { x.fillStyle = '#4a3220'; x.fillRect(xx, 0, 1, 16); }
    x.fillStyle = '#2e2018'; x.fillRect(0, 0, 16, 2);
    if (v) { x.fillStyle = '#1a1410'; x.fillRect(5, 5, 6, 5); x.fillStyle = '#e0a050'; x.fillRect(6, 6, 4, 3); x.fillStyle = '#4a3220'; x.fillRect(7, 5, 1, 5); }
  }));
  T.door = tile(x => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#2e2018'; x.fillRect(0, 0, 16, 2);
    x.fillStyle = '#3a2618'; x.fillRect(3, 3, 10, 13); x.fillStyle = '#5a3a20'; x.fillRect(4, 4, 8, 12); x.fillStyle = '#c0a040'; x.fillRect(10, 10, 1, 2);
  });
  T.doorLocked = tile(x => { x.drawImage(T.door, 0, 0); x.fillStyle = '#2a2a2e'; x.fillRect(4, 8, 8, 2); });
  T.ruinRoof = tile(x => { speckle(x, '#1e1a18', ['#2a2420', '#3a2a20', '#140e0c'], 60); x.fillStyle = '#4a2a18'; x.fillRect(2, 5, 9, 2); x.fillRect(8, 10, 6, 2); });
  T.ruinWall = tile(x => {
    x.fillStyle = '#2a1e16'; x.fillRect(0, 0, 16, 16);
    for (let xx = 0; xx < 16; xx += 4) { x.fillStyle = '#1a120c'; x.fillRect(xx, 0, 1, 16); }
    for (let i = 0; i < 20; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#0e0a08');
  });
  T.hole = tile(x => { mud(x); x.fillStyle = '#2a1e16'; x.fillRect(0, 0, 3, 16); x.fillRect(13, 0, 3, 16); x.fillStyle = '#120c08'; x.fillRect(3, 0, 10, 4); for (let i = 0; i < 8; i++) px(x, 3 + (R() * 10) | 0, 4 + (R() * 10) | 0, '#6a4a30'); });
  T.canal = [0, 1].map(f => tile(x => {
    speckle(x, '#2e3424', ['#353c28', '#262c1e'], 30);
    for (let i = 0; i < 2; i++) { x.fillStyle = f ? '#5a6040' : '#4a5034'; x.fillRect((R() * 12) | 0, (R() * 15) | 0, 3, 1); }
  }));
  T.planks = tile(x => {
    x.fillStyle = '#2e3424'; x.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 16; i += 4) { x.fillStyle = '#7a5530'; x.fillRect(1, i, 14, 3); x.fillStyle = '#5a3a20'; x.fillRect(1, i + 3, 14, 1); }
  });
  T.fence = tile(x => fenceOn(x, mud));
  T.townWall = tile(x => {
    speckle(x, '#4a4640', ['#5a5650', '#3a3630'], 40);
    x.fillStyle = '#2a2622'; for (let yy = 3; yy < 16; yy += 5) x.fillRect(0, yy, 16, 1);
    x.fillRect(4, 0, 1, 3); x.fillRect(12, 4, 1, 4); x.fillRect(6, 9, 1, 4);
  });
  // Прилавки с навесами разных цветов
  T.stall = [['#a03030', '#e0d0b0'], ['#2a5a8a', '#d8e0e8'], ['#3a7a3a', '#e0e0b0'], ['#b08020', '#f0e0b0']].map(([a, b]) => tile(x => {
    x.drawImage(T.cobble[0], 0, 0);
    x.fillStyle = '#5a3a20'; x.fillRect(0, 6, 16, 10); x.fillStyle = '#7a5530'; x.fillRect(0, 6, 16, 3);
    x.fillStyle = a; x.fillRect(0, 0, 16, 5); x.fillStyle = b; for (let i = 0; i < 16; i += 4) x.fillRect(i, 0, 2, 5);
  }));
  T.merchTable = tile(x => {
    x.drawImage(T.cobble[1], 0, 0);
    x.fillStyle = '#3a2a1a'; x.fillRect(0, 5, 16, 11); x.fillStyle = '#5a2a6a'; x.fillRect(0, 4, 16, 8);
    x.fillStyle = '#e0c050'; x.fillRect(0, 11, 16, 1); x.fillStyle = '#7a4a8a'; x.fillRect(0, 4, 16, 2);
  });
  const lawn = (x) => { speckle(x, '#3a5a30', ['#44683a', '#325028', '#4a7040'], 40); };
  T.townGrass = [tile(lawn), tile(x => { lawn(x); px(x, 4, 5, '#d8c060'); px(x, 11, 10, '#e0a0c0'); })];
  T.townTree = tile(x => { lawn(x); x.fillStyle = '#5a4a3a'; x.fillRect(3, 12, 10, 4); treeTop(x, 1); });
  T.well = tile(x => {
    x.drawImage(T.cobble[0], 0, 0);
    x.fillStyle = '#5a5650'; x.beginPath(); x.ellipse(8, 10, 7, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#10161e'; x.beginPath(); x.ellipse(8, 10, 4.5, 3, 0, 0, 7); x.fill();
    x.fillStyle = '#4a3220'; x.fillRect(1, 1, 2, 9); x.fillRect(13, 1, 2, 9); x.fillRect(1, 1, 14, 2);
  });

  // ---------- Интерьеры ----------
  const floor = (x) => {
    x.fillStyle = '#6a4a30'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 4) { x.fillStyle = '#4a3220'; x.fillRect(0, yy + 3, 16, 1); x.fillRect(((yy * 7) % 12) + 2, yy, 1, 3); }
    for (let i = 0; i < 6; i++) px(x, (R() * 16) | 0, (R() * 16) | 0, '#7a5a3a');
  };
  T.floor = [tile(floor), tile(floor)];
  T.wallTopI = tile(x => { x.fillStyle = '#2a1e16'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#3a2a1e'; for (let i = 0; i < 16; i += 5) x.fillRect(i, 0, 3, 16); });
  T.wallFrontI = tile(x => {
    x.fillStyle = '#5a4030'; x.fillRect(0, 0, 16, 16);
    for (let xx = 0; xx < 16; xx += 4) { x.fillStyle = '#3e2c20'; x.fillRect(xx, 0, 1, 14); }
    x.fillStyle = '#2a1e16'; x.fillRect(0, 13, 16, 3);
  });
  T.rug = tile(x => { floor(x); x.fillStyle = '#6a2a2a'; x.fillRect(1, 2, 14, 12); x.fillStyle = '#9a5a3a'; x.fillRect(3, 4, 10, 8); x.fillStyle = '#6a2a2a'; x.fillRect(5, 6, 6, 4); });
  T.exitMat = tile(x => { floor(x); x.fillStyle = '#3a3a2a'; x.fillRect(2, 5, 12, 9); x.fillStyle = '#d8c890'; x.fillRect(7, 7, 2, 4); x.fillRect(5, 9, 6, 1); x.fillRect(6, 10, 4, 1); });
  T.bedTop = tile(x => { floor(x); x.fillStyle = '#3a2618'; x.fillRect(1, 1, 14, 15); x.fillStyle = '#e8e0d0'; x.fillRect(3, 2, 10, 5); x.fillStyle = '#6a7a5a'; x.fillRect(2, 8, 12, 8); });
  T.bedFoot = tile(x => { floor(x); x.fillStyle = '#3a2618'; x.fillRect(1, 0, 14, 14); x.fillStyle = '#6a7a5a'; x.fillRect(2, 0, 12, 11); x.fillStyle = '#5a6a4a'; x.fillRect(2, 5, 12, 1); });
  T.table = tile(x => { floor(x); x.fillStyle = '#2e1e12'; x.fillRect(2, 11, 2, 5); x.fillRect(12, 11, 2, 5); x.fillStyle = '#8a6040'; x.fillRect(0, 3, 16, 8); x.fillStyle = '#a07850'; x.fillRect(0, 3, 16, 2); });
  T.stove = tile(x => { floor(x); x.fillStyle = '#4a4a4a'; x.fillRect(1, 1, 14, 14); x.fillStyle = '#6a6a66'; x.fillRect(1, 1, 14, 3); x.fillStyle = '#1a1010'; x.fillRect(4, 7, 8, 6); x.fillStyle = '#ff8030'; x.fillRect(5, 10, 6, 3); x.fillStyle = '#ffd060'; x.fillRect(7, 11, 2, 2); });
  T.shelf = tile(x => {
    x.drawImage(T.wallFrontI, 0, 0); x.fillStyle = '#3a2618'; x.fillRect(0, 5, 16, 2); x.fillRect(0, 11, 16, 2);
    const cols = ['#5aa080', '#a05a5a', '#c0a050', '#6a6aa0'];
    for (let i = 0; i < 4; i++) { x.fillStyle = cols[(R() * 4) | 0]; x.fillRect(1 + i * 4, 1, 2, 4); x.fillStyle = cols[(R() * 4) | 0]; x.fillRect(2 + i * 4, 8, 2, 3); }
  });
  T.stoneFloor = [0, 1].map(() => tile(x => {
    x.fillStyle = '#4a4640'; x.fillRect(0, 0, 16, 16);
    for (let yy = 0; yy < 16; yy += 8) for (let xx = (yy / 8) % 2 * 4; xx < 16; xx += 8) {
      x.fillStyle = ['#5e5a52', '#565248', '#66625a'][(R() * 3) | 0]; x.fillRect(xx, yy, 7, 7);
    }
  }));
  T.counter = tile(x => {
    x.fillStyle = '#5a4030'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#8a6a44'; x.fillRect(0, 2, 16, 9); x.fillStyle = '#a88a5a'; x.fillRect(0, 2, 16, 2);
    x.fillStyle = '#3a2a1a'; x.fillRect(0, 11, 16, 5);
  });
  T.boardTile = tile(x => { x.drawImage(T.wallFrontI, 0, 0); x.drawImage(spr.board, 2, 3); });
  T.chest = tile(x => { floor(x); x.fillStyle = '#3a2410'; x.fillRect(2, 5, 12, 10); x.fillStyle = '#7a5028'; x.fillRect(3, 6, 10, 8); x.fillStyle = '#5a3818'; x.fillRect(3, 9, 10, 1); x.fillStyle = '#c0a040'; x.fillRect(7, 9, 2, 2); });
})();
