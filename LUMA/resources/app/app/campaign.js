export const CATEGORIES=[
  {
    "id": "mirror",
    "name": "鏡と光",
    "en": "MIRRORS",
    "glyph": "╱",
    "rule": "鏡はクリックで90度回転。枠付きの浮遊鏡は、選択して空きマスへ直接配置できます。",
    "adds": "鏡・浮遊鏡の入口"
  },
  {
    "id": "floating",
    "name": "浮遊鏡",
    "en": "FLOATING MIRRORS",
    "glyph": "✧",
    "rule": "枠付きの浮遊鏡は盤面の空きマスへ自由に配置できます。選択して移動先を押すかドラッグ。ダブルクリックで回転します。",
    "adds": "自由な位置と向き"
  },
  {
    "id": "color",
    "name": "二色の光",
    "en": "TWO COLOURS",
    "glyph": "✧",
    "rule": "青の星には青、桃の星には桃。紫の星には青と桃の両方を届けます。光同士は何もないマスで交差しても直進します。",
    "adds": "二色・合流"
  },
  {
    "id": "split",
    "name": "分光器",
    "en": "SPLIT THE LIGHT",
    "glyph": "△",
    "rule": "三角の背面から入った光を左右へ分けます。側面と先端からの光は止まります。分光器も回転できます。",
    "adds": "光を分ける"
  },
  {
    "id": "lens",
    "name": "色替えレンズ",
    "en": "COLOUR LENSES",
    "glyph": "◈",
    "rule": "丸いレンズをクリックして青／桃を切り替えます。光は直進し、レンズと同じ色になります。",
    "adds": "必要な色を作る"
  },
  {
    "id": "warp",
    "name": "ワープ",
    "en": "WARP",
    "glyph": "◎",
    "rule": "同じ文字のワープがつながります。光は向きを保ってもう片方から出ます。鏡はワープできません。",
    "adds": "離れた道をつなぐ"
  },
  {
    "id": "relay",
    "name": "光のスイッチ",
    "en": "LIGHT RELAYS",
    "glyph": "◇",
    "rule": "ひし形に光が当たる間、同じ数字のゲートが開きます。光はスイッチで止まり、外れるとゲートが閉じます。",
    "adds": "光で光の道を開く"
  },
  {
    "id": "symphony",
    "name": "光の交響",
    "en": "LIGHT SYMPHONY",
    "glyph": "✺",
    "rule": "これまでの仕組みを組み合わせ、すべての星を同時に灯しましょう。",
    "adds": "すべての仕組みの総合"
  },
  {
    "id": "extra",
    "name": "EXTRA",
    "en": "AFTER THE LAST LIGHT",
    "glyph": "✦",
    "rule": "これまでの仕組みを組み合わせた、五つの難問。すべての星を同時に灯してください。",
    "adds": "41–45 · 最後の五つの光"
  }
];
export const LEVELS=[
  {
    "id": "atelier4-1",
    "category": 0,
    "name": "ステージ1",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 4,
        "t": "m",
        "r": 1
      },
      {
        "x": 2,
        "y": 2,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 2,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier4-2",
    "category": 0,
    "name": "ステージ2",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "m",
        "r": 0
      },
      {
        "x": 2,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 1,
        "y": 1,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier4-3",
    "category": 0,
    "name": "ステージ3",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 4,
        "t": "m",
        "r": 1,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 2,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "rule": "浮遊鏡は空きマスへ自由に配置できます。鏡を選び、移動先を押すかドラッグ。ダブルクリック・↻で回転します。",
    "glass": []
  },
  {
    "id": "atelier7-4",
    "category": 0,
    "name": "ステージ4",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 3,
        "y": 1,
        "t": "m",
        "r": 1
      },
      {
        "x": 3,
        "y": 5,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 3,
        "d": 3,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 5,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-5",
    "category": 0,
    "name": "ステージ5",
    "size": 7,
    "tiles": [
      {
        "x": 0,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 3,
        "y": 1,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 1
      },
      {
        "x": 3,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 1,
        "y": 5,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 3,
        "d": 3,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 0,
        "color": 1
      },
      {
        "x": 1,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier4-6-glass-v6",
    "category": 1,
    "name": "ステージ6",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 2,
        "y": 1,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 5,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 1,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [
      {
        "x": 5,
        "y": 5
      }
    ],
    "rule": "枠付きの浮遊鏡は盤面の空きマスへ自由に配置できます。選択して移動先を押すかドラッグ。ダブルクリックで回転します。 ガラスは光を通しますが、鏡は置けません。"
  },
  {
    "id": "atelier8-7",
    "category": 1,
    "name": "ステージ7",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 5,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 2,
        "y": 1,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "d": 2,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 1,
        "color": 1
      },
      {
        "x": 2,
        "y": 6,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier4-8-glass-v6",
    "category": 1,
    "name": "ステージ8",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 2,
        "y": 1,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 4,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 4,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [
      {
        "x": 6,
        "y": 1
      }
    ],
    "rule": "枠付きの浮遊鏡は盤面の空きマスへ自由に配置できます。選択して移動先を押すかドラッグ。ダブルクリックで回転します。 ガラスは光を通しますが、鏡は置けません。"
  },
  {
    "id": "atelier4-9-glass-v6",
    "category": 1,
    "name": "ステージ9",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 2,
        "t": "m",
        "r": 0
      },
      {
        "x": 3,
        "y": 3,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 5,
        "y": 4,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 2,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [
      {
        "x": 2,
        "y": 0
      }
    ],
    "rule": "枠付きの浮遊鏡は盤面の空きマスへ自由に配置できます。選択して移動先を押すかドラッグ。ダブルクリックで回転します。 ガラスは光を通しますが、鏡は置けません。"
  },
  {
    "id": "atelier7-10",
    "rule": "浮遊鏡は空きマスへ自由に配置できます。ガラスは光を通しますが、鏡は置けません。",
    "category": 1,
    "name": "ステージ10",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 3,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 3,
        "t": "m",
        "r": 1
      },
      {
        "x": 0,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 1,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 2,
        "d": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 4,
        "d": 3,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 0,
        "color": 1
      },
      {
        "x": 0,
        "y": 3,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 0,
        "y": 4
      }
    ],
    "finale": true
  },
  {
    "id": "atelier4-11",
    "category": 2,
    "name": "ステージ11",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 3,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      },
      {
        "x": 3,
        "y": 0,
        "d": 2,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 3,
        "y": 6,
        "color": 1
      },
      {
        "x": 6,
        "y": 3,
        "color": 2
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-12",
    "category": 2,
    "name": "ステージ12",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 2,
        "t": "m",
        "r": 1
      },
      {
        "x": 3,
        "y": 2,
        "t": "m",
        "r": 0
      },
      {
        "x": 3,
        "y": 4,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 1,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 3,
        "y": 0,
        "color": 1
      },
      {
        "x": 6,
        "y": 2,
        "color": 2
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-13",
    "category": 2,
    "name": "ステージ13",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 1,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 2,
        "y": 2,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      },
      {
        "x": 4,
        "y": 6,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 4,
        "y": 2,
        "color": 3
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-14",
    "category": 2,
    "name": "ステージ14",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 2,
        "t": "m",
        "r": 0
      },
      {
        "x": 3,
        "y": 4,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 2,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 2,
        "d": 1,
        "color": 1
      },
      {
        "x": 2,
        "y": 0,
        "d": 2,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 0,
        "color": 2
      },
      {
        "x": 6,
        "y": 2,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-15",
    "category": 2,
    "name": "ステージ15",
    "size": 7,
    "tiles": [
      {
        "x": 0,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 2,
        "y": 1,
        "t": "m",
        "r": 1
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 4,
        "y": 3,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 3,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      },
      {
        "x": 2,
        "y": 0,
        "d": 2,
        "color": 2
      },
      {
        "x": 6,
        "y": 5,
        "d": 3,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 1,
        "color": 2
      },
      {
        "x": 5,
        "y": 1,
        "color": 3
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier4-16",
    "category": 3,
    "name": "ステージ16",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 3,
        "t": "p",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 5,
        "d": 0,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 1,
        "y": 3,
        "color": 1
      },
      {
        "x": 5,
        "y": 3,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier4-17",
    "category": 3,
    "name": "ステージ17",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 4,
        "t": "p",
        "r": 2
      },
      {
        "x": 1,
        "y": 4,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 3,
        "t": "m",
        "r": 1,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 1,
        "y": 0,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-18",
    "category": 3,
    "name": "ステージ18",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 4,
        "t": "p",
        "r": 1
      },
      {
        "x": 1,
        "y": 4,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 4,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 2,
        "t": "p",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 1,
        "y": 0,
        "color": 1
      },
      {
        "x": 3,
        "y": 2,
        "color": 1
      },
      {
        "x": 6,
        "y": 2,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-19",
    "category": 3,
    "name": "ステージ19",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 3,
        "t": "p",
        "r": 2
      },
      {
        "x": 1,
        "y": 3,
        "t": "m",
        "r": 0
      },
      {
        "x": 6,
        "y": 5,
        "t": "m",
        "r": 1,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 1,
        "y": 6,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 1,
        "y": 0,
        "color": 1
      },
      {
        "x": 0,
        "y": 3,
        "color": 2
      },
      {
        "x": 5,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-20",
    "category": 3,
    "name": "ステージ20",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 4,
        "t": "p",
        "r": 1
      },
      {
        "x": 1,
        "y": 4,
        "t": "m",
        "r": 0
      },
      {
        "x": 1,
        "y": 2,
        "t": "p",
        "r": 1
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 3,
        "y": 1,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 6,
        "y": 2,
        "d": 3,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 2,
        "color": 1
      },
      {
        "x": 2,
        "y": 2,
        "color": 1
      },
      {
        "x": 5,
        "y": 1,
        "color": 3
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier4-21",
    "category": 4,
    "name": "ステージ21",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 2,
        "y": 2,
        "t": "f",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 2,
        "y": 0,
        "color": 2
      },
      {
        "x": 2,
        "y": 6,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier8-22",
    "category": 4,
    "name": "ステージ22",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "f",
        "r": 0
      },
      {
        "x": 5,
        "y": 3,
        "t": "m",
        "r": 1
      },
      {
        "x": 1,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      },
      {
        "x": 0,
        "y": 5,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 0,
        "color": 2
      },
      {
        "x": 6,
        "y": 3,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [
      {
        "x": 6,
        "y": 5
      }
    ],
    "rule": "レンズで光の色を変えます。ガラスは光を通しますが、鏡は置けません。"
  },
  {
    "id": "atelier4-23",
    "category": 4,
    "name": "ステージ23",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 4,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 2,
        "y": 2,
        "t": "f",
        "r": 0
      },
      {
        "x": 2,
        "y": 1,
        "t": "p",
        "r": 2
      },
      {
        "x": 4,
        "y": 1,
        "t": "f",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 1,
        "color": 2
      },
      {
        "x": 6,
        "y": 1,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-24",
    "category": 4,
    "name": "ステージ24",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 3,
        "t": "f",
        "r": 1
      },
      {
        "x": 3,
        "y": 3,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 4,
        "y": 5,
        "t": "f",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 3,
        "y": 0,
        "color": 1
      },
      {
        "x": 5,
        "y": 1,
        "color": 2
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-25",
    "category": 4,
    "name": "ステージ25",
    "size": 7,
    "tiles": [
      {
        "x": 4,
        "y": 4,
        "t": "p",
        "r": 1
      },
      {
        "x": 2,
        "y": 4,
        "t": "m",
        "r": 0
      },
      {
        "x": 2,
        "y": 2,
        "t": "p",
        "r": 1
      },
      {
        "x": 3,
        "y": 2,
        "t": "f",
        "r": 0
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 4,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 2,
        "color": 1
      },
      {
        "x": 4,
        "y": 2,
        "color": 2
      },
      {
        "x": 6,
        "y": 1,
        "color": 3
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier4-26",
    "category": 5,
    "name": "ステージ26",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 5,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 1,
        "color": 1
      }
    ],
    "portals": [
      {
        "x": 2,
        "y": 3,
        "pair": 0
      },
      {
        "x": 5,
        "y": 4,
        "pair": 0
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-27",
    "category": 5,
    "name": "ステージ27",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 4,
        "t": "m",
        "r": 1
      },
      {
        "x": 4,
        "y": 1,
        "t": "m",
        "r": 1
      },
      {
        "x": 2,
        "y": 1,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      },
      {
        "x": 4,
        "y": 6,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 1,
        "color": 1
      },
      {
        "x": 0,
        "y": 1,
        "color": 2
      }
    ],
    "portals": [
      {
        "x": 2,
        "y": 2,
        "pair": 0
      },
      {
        "x": 4,
        "y": 5,
        "pair": 0
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-28",
    "category": 5,
    "name": "ステージ28",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 4,
        "t": "p",
        "r": 2
      },
      {
        "x": 6,
        "y": 2,
        "t": "m",
        "r": 0
      },
      {
        "x": 6,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 3,
        "y": 1,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 1,
        "y": 6,
        "d": 0,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 4,
        "color": 1
      },
      {
        "x": 4,
        "y": 1,
        "color": 1
      }
    ],
    "portals": [
      {
        "x": 3,
        "y": 4,
        "pair": 0
      },
      {
        "x": 5,
        "y": 2,
        "pair": 0
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-29",
    "category": 5,
    "name": "ステージ29",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 4,
        "t": "f",
        "r": 1
      },
      {
        "x": 5,
        "y": 1,
        "t": "p",
        "r": 2
      },
      {
        "x": 5,
        "y": 3,
        "t": "f",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 0,
        "color": 1
      },
      {
        "x": 1,
        "y": 5,
        "color": 2
      }
    ],
    "portals": [
      {
        "x": 3,
        "y": 4,
        "pair": 0
      },
      {
        "x": 4,
        "y": 1,
        "pair": 0
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-30",
    "category": 5,
    "name": "ステージ30",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 5,
        "t": "f",
        "r": 1
      },
      {
        "x": 2,
        "y": 5,
        "t": "p",
        "r": 2
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 4,
        "y": 5,
        "t": "p",
        "r": 3
      },
      {
        "x": 5,
        "y": 5,
        "t": "f",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 5,
        "d": 1,
        "color": 2
      },
      {
        "x": 6,
        "y": 4,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 1,
        "color": 3
      },
      {
        "x": 3,
        "y": 5,
        "color": 1
      },
      {
        "x": 6,
        "y": 5,
        "color": 2
      }
    ],
    "portals": [
      {
        "x": 2,
        "y": 3,
        "pair": 0
      },
      {
        "x": 5,
        "y": 4,
        "pair": 0
      },
      {
        "x": 2,
        "y": 6,
        "pair": 1
      },
      {
        "x": 4,
        "y": 2,
        "pair": 1
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier4-31",
    "category": 6,
    "name": "ステージ31",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 2,
        "y": 5,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 5,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [
      {
        "x": 2,
        "y": 1,
        "group": 1
      }
    ],
    "gates": [
      {
        "x": 2,
        "y": 4,
        "group": 1
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier4-33",
    "category": 6,
    "name": "ステージ32",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 2,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 2,
        "y": 5,
        "t": "p",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 1,
        "d": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 5,
        "d": 3,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 2,
        "y": 0,
        "color": 2
      },
      {
        "x": 2,
        "y": 6,
        "color": 2
      }
    ],
    "portals": [],
    "switches": [
      {
        "x": 3,
        "y": 3,
        "group": 1
      }
    ],
    "gates": [
      {
        "x": 2,
        "y": 3,
        "group": 1
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier8-33",
    "category": 6,
    "name": "ステージ33",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 0,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 3,
        "d": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 0,
        "d": 2,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 5,
        "y": 5,
        "color": 3
      }
    ],
    "portals": [
      {
        "x": 6,
        "y": 2,
        "pair": 0
      },
      {
        "x": 5,
        "y": 1,
        "pair": 0
      }
    ],
    "switches": [
      {
        "x": 2,
        "y": 0,
        "group": 1
      }
    ],
    "gates": [
      {
        "x": 5,
        "y": 3,
        "group": 1
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier4-34",
    "category": 6,
    "name": "ステージ34",
    "size": 7,
    "tiles": [
      {
        "x": 4,
        "y": 4,
        "t": "p",
        "r": 1
      },
      {
        "x": 4,
        "y": 6,
        "t": "m",
        "r": 1
      },
      {
        "x": 1,
        "y": 6,
        "t": "m",
        "r": 0
      },
      {
        "x": 1,
        "y": 2,
        "t": "p",
        "r": 2
      }
    ],
    "sources": [
      {
        "x": 6,
        "y": 4,
        "d": 3,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 2,
        "color": 1
      }
    ],
    "portals": [],
    "switches": [
      {
        "x": 4,
        "y": 1,
        "group": 1
      },
      {
        "x": 0,
        "y": 2,
        "group": 2
      }
    ],
    "gates": [
      {
        "x": 4,
        "y": 5,
        "group": 1
      },
      {
        "x": 3,
        "y": 2,
        "group": 2
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-35",
    "category": 6,
    "name": "ステージ35",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 4,
        "t": "p",
        "r": 2
      },
      {
        "x": 2,
        "y": 6,
        "t": "p",
        "r": 3
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 3,
        "y": 1,
        "t": "p",
        "r": 1
      },
      {
        "x": 4,
        "y": 1,
        "t": "f",
        "r": 0
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      },
      {
        "x": 6,
        "y": 3,
        "d": 3,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 6,
        "color": 1
      },
      {
        "x": 5,
        "y": 3,
        "color": 3
      }
    ],
    "portals": [
      {
        "x": 5,
        "y": 4,
        "pair": 0
      },
      {
        "x": 3,
        "y": 3,
        "pair": 0
      }
    ],
    "switches": [
      {
        "x": 2,
        "y": 2,
        "group": 1
      },
      {
        "x": 0,
        "y": 1,
        "group": 2
      }
    ],
    "gates": [
      {
        "x": 2,
        "y": 5,
        "group": 1
      },
      {
        "x": 5,
        "y": 2,
        "group": 2
      }
    ],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier8-36",
    "category": 7,
    "name": "ステージ36",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 5,
        "t": "p",
        "r": 1
      },
      {
        "x": 3,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 3,
        "y": 0,
        "d": 2,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 3,
        "color": 1
      },
      {
        "x": 6,
        "y": 3,
        "color": 1
      },
      {
        "x": 1,
        "y": 0,
        "color": 2
      },
      {
        "x": 5,
        "y": 0,
        "color": 2
      }
    ],
    "portals": [],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier8-37",
    "category": 7,
    "name": "ステージ37",
    "size": 7,
    "tiles": [
      {
        "x": 2,
        "y": 5,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 2,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      }
    ],
    "sources": [
      {
        "x": 2,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 3,
        "y": 0,
        "d": 2,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 2,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "color": 2
      },
      {
        "x": 3,
        "y": 4,
        "color": 3
      }
    ],
    "portals": [
      {
        "x": 6,
        "y": 2,
        "pair": 0
      },
      {
        "x": 0,
        "y": 4,
        "pair": 0
      },
      {
        "x": 1,
        "y": 0,
        "pair": 1
      },
      {
        "x": 3,
        "y": 6,
        "pair": 1
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-38",
    "category": 7,
    "name": "ステージ38",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 5,
        "t": "f",
        "r": 1
      },
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 5,
        "y": 2,
        "t": "p",
        "r": 1
      },
      {
        "x": 2,
        "y": 2,
        "t": "m",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 5,
        "d": 1,
        "color": 2
      },
      {
        "x": 5,
        "y": 6,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 3,
        "y": 2,
        "color": 3
      },
      {
        "x": 6,
        "y": 2,
        "color": 1
      }
    ],
    "portals": [
      {
        "x": 2,
        "y": 3,
        "pair": 0
      },
      {
        "x": 5,
        "y": 4,
        "pair": 0
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-39",
    "category": 7,
    "name": "ステージ39",
    "size": 7,
    "tiles": [
      {
        "x": 4,
        "y": 5,
        "t": "p",
        "r": 0
      },
      {
        "x": 0,
        "y": 2,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 3,
        "y": 5,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 6,
        "t": "m",
        "r": 1
      },
      {
        "x": 2,
        "y": 0,
        "t": "f",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 6,
        "y": 5,
        "d": 3,
        "color": 1
      },
      {
        "x": 0,
        "y": 0,
        "d": 1,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 6,
        "color": 1
      },
      {
        "x": 6,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [
      {
        "x": 4,
        "y": 6,
        "pair": 0
      },
      {
        "x": 1,
        "y": 3,
        "pair": 0
      }
    ],
    "switches": [
      {
        "x": 4,
        "y": 1,
        "group": 1
      },
      {
        "x": 3,
        "y": 2,
        "group": 2
      }
    ],
    "gates": [
      {
        "x": 2,
        "y": 5,
        "group": 1
      },
      {
        "x": 2,
        "y": 6,
        "group": 2
      },
      {
        "x": 5,
        "y": 0,
        "group": 2
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier7-40",
    "category": 7,
    "name": "ステージ40",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 4,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 6,
        "t": "p",
        "r": 3
      },
      {
        "x": 0,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 2,
        "y": 1,
        "t": "p",
        "r": 1
      },
      {
        "x": 3,
        "y": 1,
        "t": "f",
        "r": 0
      },
      {
        "x": 6,
        "y": 0,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 5,
        "y": 3,
        "t": "p",
        "r": 3
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "d": 2,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 6,
        "color": 1
      },
      {
        "x": 4,
        "y": 3,
        "color": 3
      }
    ],
    "portals": [
      {
        "x": 1,
        "y": 5,
        "pair": 0
      },
      {
        "x": 2,
        "y": 3,
        "pair": 0
      }
    ],
    "switches": [
      {
        "x": 3,
        "y": 2,
        "group": 1
      },
      {
        "x": 0,
        "y": 1,
        "group": 2
      },
      {
        "x": 6,
        "y": 3,
        "group": 3
      }
    ],
    "gates": [
      {
        "x": 3,
        "y": 5,
        "group": 1
      },
      {
        "x": 4,
        "y": 2,
        "group": 2
      },
      {
        "x": 5,
        "y": 6,
        "group": 3
      }
    ],
    "walls": [],
    "glass": [],
    "finale": true
  },
  {
    "id": "atelier9-extra-41",
    "category": 8,
    "name": "ステージ41",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 4,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 2,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 4,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 4,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 1,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 1,
        "y": 1,
        "t": "f",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 3,
        "y": 0,
        "d": 2,
        "color": 2
      },
      {
        "x": 6,
        "y": 4,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 5,
        "color": 1
      },
      {
        "x": 6,
        "y": 2,
        "color": 3
      },
      {
        "x": 1,
        "y": 0,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "color": 2
      }
    ],
    "portals": [
      {
        "x": 0,
        "y": 2,
        "pair": 0
      },
      {
        "x": 4,
        "y": 5,
        "pair": 0
      }
    ],
    "switches": [],
    "gates": [],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier9-extra-42",
    "category": 8,
    "name": "ステージ42",
    "size": 7,
    "tiles": [
      {
        "x": 1,
        "y": 4,
        "t": "p",
        "r": 1
      },
      {
        "x": 3,
        "y": 2,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 3,
        "y": 1,
        "t": "p",
        "r": 2
      },
      {
        "x": 4,
        "y": 1,
        "t": "f",
        "r": 0
      }
    ],
    "sources": [
      {
        "x": 1,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "d": 2,
        "color": 2
      },
      {
        "x": 0,
        "y": 5,
        "d": 1,
        "color": 2
      },
      {
        "x": 6,
        "y": 0,
        "d": 2,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 4,
        "color": 1
      },
      {
        "x": 6,
        "y": 2,
        "color": 2
      },
      {
        "x": 4,
        "y": 6,
        "color": 2
      },
      {
        "x": 6,
        "y": 1,
        "color": 3
      }
    ],
    "portals": [
      {
        "x": 3,
        "y": 4,
        "pair": 0
      },
      {
        "x": 4,
        "y": 2,
        "pair": 0
      }
    ],
    "switches": [
      {
        "x": 0,
        "y": 1,
        "group": 1
      }
    ],
    "gates": [
      {
        "x": 5,
        "y": 1,
        "group": 1
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier9-extra-43",
    "category": 8,
    "name": "ステージ43",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 5,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 2,
        "y": 3,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 4,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 6,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 2,
        "t": "f",
        "r": 1
      },
      {
        "x": 1,
        "y": 1,
        "t": "p",
        "r": 2
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 3,
        "y": 0,
        "d": 2,
        "color": 2
      },
      {
        "x": 6,
        "y": 0,
        "d": 2,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 3,
        "color": 1
      },
      {
        "x": 5,
        "y": 0,
        "color": 2
      },
      {
        "x": 6,
        "y": 6,
        "color": 1
      },
      {
        "x": 6,
        "y": 1,
        "color": 3
      }
    ],
    "portals": [],
    "switches": [
      {
        "x": 0,
        "y": 1,
        "group": 1
      },
      {
        "x": 6,
        "y": 2,
        "group": 2
      }
    ],
    "gates": [
      {
        "x": 1,
        "y": 4,
        "group": 2
      },
      {
        "x": 5,
        "y": 2,
        "group": 1
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier9-extra-44",
    "category": 8,
    "name": "ステージ44",
    "size": 7,
    "tiles": [
      {
        "x": 0,
        "y": 0,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 5,
        "y": 0,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 4,
        "y": 0,
        "t": "p",
        "r": 2
      },
      {
        "x": 4,
        "y": 3,
        "t": "m",
        "r": 1
      },
      {
        "x": 5,
        "y": 4,
        "t": "f",
        "r": 0
      },
      {
        "x": 1,
        "y": 4,
        "t": "p",
        "r": 2
      },
      {
        "x": 1,
        "y": 3,
        "t": "m",
        "r": 1
      },
      {
        "x": 2,
        "y": 3,
        "t": "m",
        "r": 1
      },
      {
        "x": 1,
        "y": 5,
        "t": "p",
        "r": 3
      },
      {
        "x": 5,
        "y": 2,
        "t": "p",
        "r": 3
      }
    ],
    "sources": [
      {
        "x": 0,
        "y": 2,
        "d": 1,
        "color": 1
      },
      {
        "x": 0,
        "y": 4,
        "d": 1,
        "color": 2
      },
      {
        "x": 6,
        "y": 6,
        "d": 0,
        "color": 1
      }
    ],
    "targets": [
      {
        "x": 6,
        "y": 4,
        "color": 3
      },
      {
        "x": 4,
        "y": 6,
        "color": 2
      },
      {
        "x": 5,
        "y": 6,
        "color": 2
      },
      {
        "x": 6,
        "y": 0,
        "color": 1
      }
    ],
    "portals": [
      {
        "x": 2,
        "y": 0,
        "pair": 0
      },
      {
        "x": 4,
        "y": 1,
        "pair": 0
      },
      {
        "x": 3,
        "y": 0,
        "pair": 1
      },
      {
        "x": 6,
        "y": 3,
        "pair": 1
      },
      {
        "x": 3,
        "y": 5,
        "pair": 2
      },
      {
        "x": 2,
        "y": 4,
        "pair": 2
      }
    ],
    "switches": [
      {
        "x": 0,
        "y": 5,
        "group": 1
      },
      {
        "x": 5,
        "y": 1,
        "group": 2
      }
    ],
    "gates": [
      {
        "x": 3,
        "y": 4,
        "group": 1
      },
      {
        "x": 5,
        "y": 3,
        "group": 2
      }
    ],
    "walls": [],
    "glass": []
  },
  {
    "id": "atelier9-extra-45",
    "category": 8,
    "name": "ステージ45",
    "size": 7,
    "tiles": [
      {
        "x": 3,
        "y": 5,
        "t": "p",
        "r": 2
      },
      {
        "x": 3,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 5,
        "t": "m",
        "r": 0
      },
      {
        "x": 5,
        "y": 5,
        "t": "m",
        "r": 1
      },
      {
        "x": 2,
        "y": 3,
        "t": "m",
        "r": 1,
        "movable": true
      },
      {
        "x": 6,
        "y": 6,
        "t": "m",
        "r": 0,
        "movable": true
      },
      {
        "x": 6,
        "y": 3,
        "t": "p",
        "r": 3
      },
      {
        "x": 1,
        "y": 2,
        "t": "f",
        "r": 1
      },
      {
        "x": 1,
        "y": 1,
        "t": "p",
        "r": 2
      },
      {
        "x": 5,
        "y": 0,
        "t": "p",
        "r": 1
      },
      {
        "x": 2,
        "y": 4,
        "t": "f",
        "r": 1
      }
    ],
    "sources": [
      {
        "x": 3,
        "y": 6,
        "d": 0,
        "color": 1
      },
      {
        "x": 3,
        "y": 0,
        "d": 2,
        "color": 2
      },
      {
        "x": 4,
        "y": 2,
        "d": 0,
        "color": 2
      }
    ],
    "targets": [
      {
        "x": 0,
        "y": 3,
        "color": 1
      },
      {
        "x": 0,
        "y": 6,
        "color": 1
      },
      {
        "x": 4,
        "y": 4,
        "color": 1
      },
      {
        "x": 4,
        "y": 1,
        "color": 3
      }
    ],
    "portals": [
      {
        "x": 6,
        "y": 4,
        "pair": 0
      },
      {
        "x": 0,
        "y": 5,
        "pair": 0
      },
      {
        "x": 6,
        "y": 0,
        "pair": 1
      },
      {
        "x": 0,
        "y": 4,
        "pair": 1
      }
    ],
    "switches": [
      {
        "x": 0,
        "y": 1,
        "group": 1
      },
      {
        "x": 6,
        "y": 2,
        "group": 2
      },
      {
        "x": 4,
        "y": 0,
        "group": 3
      }
    ],
    "gates": [
      {
        "x": 1,
        "y": 4,
        "group": 2
      },
      {
        "x": 5,
        "y": 2,
        "group": 1
      },
      {
        "x": 2,
        "y": 1,
        "group": 3
      }
    ],
    "walls": [],
    "glass": [],
    "finale": true
  }
];
