var canvas = document.getElementById("main_canvas")
var ctx = canvas.getContext("2d");
ctx.canvas.width  = window.innerWidth;
ctx.canvas.height = window.innerHeight;

ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;

// The original size of each tile in pixels.
var TILE_SIZE = 16;

// The number of tiles which will fit on the screen horizontally.
var TILES_PER_SCREEN_HORIZ = 24;

var tile_data = [
  {
    type: "invalid",
    name: "Invalid",
    description: "oh no."
  },
  {
    type: "ground",
    name: "Grass",
    description: "Average-length grass. Can be walked on."
  },
  {
    type: "ground",
    name: "Grass",
    description: "Average-length grass. Can be walked on."
  },
  {
    type: "wall",
    name: "Brick Wall",
    description: "A sturdy brick wall. Impassable."
  },
  {
    type: "ground",
    name: "Dirt Path",
    description: "A cheap dirt path. Can be walked on."
  },
  {
    type: "water",
    name: "Water",
    description: "Wet water. You can swim in it with the right item."
  },
  {
    type: "water",
    name: "Water",
    description: "Wet water. You can swim in it with the right item."
  },
  {
    type: "hedge_full",
    name: "Hedge",
    description: "A well-kept hedge. Can be chopped down with an axe (takes two hits)."
  },
  {
    type: "capture_target",
    name: "Doorway",
    description: "A large, looming, omnipresent doorway. To capture, select Interact."
  },
  {
    type: "chest",
    name: "Chest",
    description: "A chest. Locked, of course. I hope it has something good inside."
  },
  {
    type: "wall",
    name: "Opened Chest",
    description: "An opened chest. Sorry, the excitement is over."
  },
  {
    type: "wood_wall",
    name: "Wooden Barricade",
    description: "A temporary wooden barricade. Can be burned."
  },
  {
    type: "hedge_damaged",
    name: "Trimmed Hedge",
    description: "An even more well-kept hedge. Give it another wack."
  },
]

var weapon_damage = {
  "iron_sword": 5,
  "iron_lance": 4,
  "iron_axe": 6,
  "steel_sword": 9,
  "steel_lance": 8,
  "steel_axe": 10,
  "bow": 7,
  "fire": 8,
  "thunder": 7,
  "wind": 6
}

var entity_data = {
  player: {
    name: "You",
    description: "It's you."
  },
  enemy: {
    name: "Enemy",
    description: "An nasty enemy. Probably wants to kill you, for some reason."
  },
};

var inventory = [
  {
    id: "iron_sword",
    durability: 25
  }
]

var equipped = 0;

var entities = [
  {
    type: "player",
    x: 0,
    y: 8,
    hp: 30,
    max_hp: 30,
    level: 1,
    xp: 0,
    tile: 128,
    horiz_flip: false
  },

  {
    type: "enemy",
    weapon: "iron_sword",
    x: 2,
    y: 3,
    hp: 10,
    max_hp: 20,
    level: 1,
    res_sword: 3,
    res_lance: -3,
    res_axe: 0,
    res_bow: 0,
    res_fire: 5,
    res_thunder: 0,
    res_wind: 0,
    tile: 128 + 16,
    horiz_flip: true
  },
]

// Game state.
var game_state = "player_turn"
var player_turn_state = "unhighlighted"; // unhighlighted, highlighted or action.
var player_prev_x = 0;
var player_prev_y = 0;
var enemy_turn_timer = 0;
var enemy_turn_moving = 0;
var battle_with = 0;
var battle_timer = 0;
var battle_by_player = false;
var battle_player_hit = false;
var battle_enemy_hit = false;

var sprite_sheet = new Image();
sprite_sheet.addEventListener("load", function() {
  window.requestAnimationFrame(draw);
}, false);
sprite_sheet.src = "sprites.png";

// Gets the relative size of a tile. Multiply by 16 for the actual size in pixels.
function get_tile_scale() {
  return window.innerWidth / TILES_PER_SCREEN_HORIZ / 16;
}

// Converts tile coordinates to pixel coordinates.
function tile_coords_to_pixels(coords) {
  return {
    x: get_tile_scale() * 16 * coords.x,
    y: get_tile_scale() * 16 * coords.y
  };
}

// Converts pixel coordinates to tile coordinates.
function pixels_to_tile_coords(coords) {
  return {
    x: coords.x / 16 / get_tile_scale(),
    y: coords.y / 16 / get_tile_scale()
  };
}

var camera_x = 0;
var camera_y = 0;

// Draws a tile.
function draw_tile(tile, coords) {
  var size = get_tile_scale() * 16;
  var pixel_coords = tile_coords_to_pixels(coords)

  ctx.drawImage(sprite_sheet, (tile % 16) * 16, Math.floor(tile / 16) * 16, 16, 16, pixel_coords.x - camera_x, pixel_coords.y - camera_y, size, size);
}

var last_time = 0;
var tile_update_timer = 0;

function draw_map(map_name) {
  var map = maps[map_name];
  var width = map.width;
  var height = map.height;
  var data = map.layers[0].data;

  ctx.fillStyle = "#5A3500";
  ctx.fillRect(-16 * get_tile_scale() - camera_x, -16 * get_tile_scale() - camera_y, (width + 2) * 16 * get_tile_scale(), (height + 2) * 16 * get_tile_scale());

  for (var i = 0; i < data.length; i++) {
    var tile_coords = {x: i % width, y: Math.floor(i / width)};
    draw_tile(data[i] - 1, tile_coords);

    if (tile_update_timer > 0.5) {
      switch (data[i]) {
        case 2:
          data[i] = 3;
          break;
        case 3:
          data[i] = 2;
          break;
        case 6:
          data[i] = 7;
          break;
        case 7:
          data[i] = 6;
          break;
      }
    }
  }

  if (tile_update_timer > 0.5) {
    tile_update_timer = 0;
  }

}

function draw_highlight_recurse(x, y, range, highlighted, max_range, highlight_list) {

  var map = maps["map_00"];
  var width = map.width;
  var height = map.height;
  var data = map.layers[0].data;
  var index = y * width + x;

  if (x >= 0 && x < width && y >= 0 && y < height && tile_data[data[index] - 1].type == "ground") {

    // Has it already been considered at an equal or lower range?
    var found = false;
    for (var i = 0; i <= range; i++) {
      if (highlighted[i].includes(index)) {
        found = true;
      }
    }

    if (!found) {

      highlighted[range].push(index);

      if (range == max_range) {
        var overwrote = false;
        for (var i = 0; i < highlight_list.length; i++) {
          if (highlight_list[i].x == x && highlight_list[i].y == y) {
            overwrote = true;
          }
        }
        if (!overwrote) {
          highlight_list.push({x: x, y: y, colour: "#FF000060"});
        }
      } else {

        var overwrote = false;
        for (var i = 0; i < highlight_list.length; i++) {
          if (highlight_list[i].x == x && highlight_list[i].y == y) {
            highlight_list[i].colour = "#0000FF60";
            overwrote = true;
          }
        }
        if (!overwrote) {
          highlight_list.push({x: x, y: y, colour: "#0000FF60"});
        }
  
        draw_highlight_recurse(x + 1, y, range + 1, highlighted, max_range, highlight_list);
        draw_highlight_recurse(x - 1, y, range + 1, highlighted, max_range, highlight_list);
        draw_highlight_recurse(x, y + 1, range + 1, highlighted, max_range, highlight_list);
        draw_highlight_recurse(x, y - 1, range + 1, highlighted, max_range, highlight_list);
      }
    }

  }



}

function draw_highlight(origin_x, origin_y, max) {
  var highlighted = [];

  for (var i = 0; i <= max + 1; i++) {
    highlighted[i] = [];
  }

  highlight_list = []

  draw_highlight_recurse(origin_x, origin_y, 0, highlighted, max, highlight_list);

  for (var i = 0; i < highlight_list.length; i++) {
    var pixel_coords = tile_coords_to_pixels({x: highlight_list[i].x, y: highlight_list[i].y});
    var size = get_tile_scale() * 16;
    ctx.fillStyle = highlight_list[i].colour;
    ctx.fillRect(pixel_coords.x - camera_x, pixel_coords.y - camera_y, size, size);
    ctx.fillRect(pixel_coords.x - camera_x + 2, pixel_coords.y - camera_y + 2, size - 4, size - 4);
  }
}

function is_movable_to(origin_x, origin_y, max, x, y) {
  var highlighted = [];

  for (var i = 0; i <= max + 1; i++) {
    highlighted[i] = [];
  }

  highlight_list = []

  draw_highlight_recurse(origin_x, origin_y, 0, highlighted, max, highlight_list);

  var near_check = false;
  for (var i = 0; i < highlight_list.length; i++) {
    if (highlight_list[i].x == x && highlight_list[i].y == y && highlight_list[i].colour == "#0000FF60") {
      near_check = true;
    }
  }

  var clear_check = true;
  for (var i = 0; i < entities.length; i++) {
    if (entities[i].x == x && entities[i].y == y && !(x == origin_x && y == origin_y)) {
      clear_check = false;
    }
  }

  return near_check && clear_check;
}

function draw_ui() {

  ctx.fillStyle = "#20202080";
  ctx.fillRect(0, 0, window.innerWidth, 24 + 8 + 16 + 8);

  var mouse_tile_coords = pixels_to_tile_coords({x: prev_mouse_pos_x + camera_x, y: prev_mouse_pos_y + camera_y}); // Previous ones are close enough.

  var map = maps["map_00"];
  var width = map.width;
  var height = map.height;
  var data = map.layers[0].data;

  if (!(mouse_tile_coords.x < 0 || mouse_tile_coords.x > width || mouse_tile_coords.y < 0 || mouse_tile_coords.y > height)) {

    var name_text = "";
    var desc_text = "";

    var index = Math.floor(mouse_tile_coords.y) * width + Math.floor(mouse_tile_coords.x);
  
    var tile_id = data[index] - 1;
    var tile_data_entry = tile_data[tile_id];

    name_text = tile_data_entry.name;
    desc_text = tile_data_entry.description;

    for (var i = 0; i < entities.length; i++) {
      var entity = entities[i];
      if (Math.floor(mouse_tile_coords.x) == entity.x && Math.floor(mouse_tile_coords.y) == entity.y && entity.type != "null") {
        name_text = entity_data[entity.type].name;
        desc_text = entity_data[entity.type].description;
        if (entity.type == "player" || entity.type == "enemy") {
          desc_text += " (HP: " + entity.hp + "/" + entity.max_hp + ")";
        }
      }
    }
  
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "18px sans";
    ctx.fillText(name_text, 8, 18 + 8);
    ctx.font = "16px sans";
    ctx.fillText(desc_text, 8, 24 + 8 + 16);

  }

}

function draw_entities() {

  for (var i = 0; i < entities.length; i++) {

    var entity = entities[i];

    draw_tile(entity.tile, {x: entity.x, y: entity.y});

  }

}

var is_mouse_down = false;
var prev_mouse_pos_x = -1;
var prev_mouse_pos_y = -1;


canvas.addEventListener("mousedown", e => {
  is_mouse_down = true;

  var mouse_tile_coords = pixels_to_tile_coords({x: e.clientX + camera_x, y: e.clientY + camera_y});

  var mouse_tile_x = Math.floor(mouse_tile_coords.x);
  var mouse_tile_y = Math.floor(mouse_tile_coords.y);

  for (var i = 0; i < entities.length; i++) {

    var entity = entities[i];

    if (game_state == "player_turn" && entity.type == "player") {
      if (player_turn_state == "unhighlighted" && mouse_tile_x == entity.x && mouse_tile_y == entity.y) {
        player_turn_state = "highlighted";
      } else if (player_turn_state == "highlighted" && is_movable_to(entity.x, entity.y, 5, mouse_tile_x, mouse_tile_y)) {
        player_prev_x = entity.x;
        player_prev_y = entity.y;
        entity.x = mouse_tile_x;
        entity.y = mouse_tile_y;
        player_turn_state = "action";
      } else if (player_turn_state == "action") {
        if (e.clientX >= 64 && e.clientX <= 64 + 128 && e.clientY >= 64 && e.clientY <= 64 + 64 * 5) {
          switch(Math.floor((e.clientY - 64) / 64)) {
            case 0:

              for (var i = 0; i < entities.length; i++) {
                var entity2 = entities[i];
                if (entity2.type == "enemy") {
                  if ((entity.x == entity2.x && entity.y == entity2.y + 1) || (entity.x == entity2.x && entity.y == entity2.y - 1) || (entity.x == entity2.x + 1 && entity.y == entity2.y) || (entity.x == entity2.x - 1 && entity.y == entity2.y)) {
                    battle_with = i;
                    battle_by_player = true;
                    game_state = "battle";
                  }
                }
              }

              break;
            case 1:
              break;
            case 2:
              break;
            case 3:
              player_turn_state = "unhighlighted";
              game_state = "enemy_turn";
              break;
            case 4:
              player_turn_state = "unhighlighted";
              entity.x = player_prev_x;
              entity.y = player_prev_y;
              break;
          }
          
        }
      }
    }
  }

});

canvas.addEventListener("mouseup", e => {
  is_mouse_down = false;
});


canvas.addEventListener("mousemove", e => {

  var x = e.clientX;
  var y = e.clientY;

  var dx = x - prev_mouse_pos_x;
  var dy = y - prev_mouse_pos_y;

  prev_mouse_pos_x = x;
  prev_mouse_pos_y = y;

  if (is_mouse_down) {
    camera_x -= dx;
    camera_y -= dy;
  }

});

function draw(timestamp) {
  // Get delta time in seconds.
  var dt = (timestamp - last_time) / 1000;
  last_time = timestamp;

  ctx.fillStyle = "#202020";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  tile_update_timer += dt;

  switch (game_state) {

    case "player_turn":
      draw_map("map_00");
      if (player_turn_state == "highlighted") {
        for (var i = 0; i < entities.length; i++) {
          if (entities[i].type == "player") {
            draw_highlight(entities[i].x, entities[i].y, 5);
          }
        }
      }
      draw_entities();
      draw_ui();
      if (player_turn_state == "action") {
        var actions = [
          "Attack",
          "Interact",
          "Item",
          "Wait",
          "Cancel"
        ]
        for (var i = 0; i < 5; i++) {
          ctx.fillStyle = "#40404080";
          ctx.fillRect(64 + 1, 64 + i * 64 + 1, 128 - 2, 64 - 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "16px sans";
          ctx.fillText(actions[i], 64 + 8, 64 + i * 64 + 32 + 8);
        }
      }
      break;

    case "enemy_turn":

      enemy_turn_timer += dt;

      if (enemy_turn_timer > 1) {
        enemy_turn_timer = 0;

        while (entities.length != enemy_turn_moving && entities[enemy_turn_moving].type != "enemy") {
          enemy_turn_moving++;
        }
  
        if (entities.length <= enemy_turn_moving) {
          enemy_turn_moving = 0;
          player_turn_state = "unhighlighted";
          game_state = "player_turn";
        }

        enemy_turn_moving++;
      }

      draw_map("map_00");
      draw_entities();
      draw_ui();
      break;

    case "battle":
      battle_timer += dt;

      var travel_dist = window.innerWidth - 512;
      var enemy_pos = 256;
      var player_pos = window.innerWidth - 256;

      if (battle_timer > 0.5 && battle_timer < 1) {
        var fraction = (battle_timer - 0.5) / 0.5;
        player_pos = window.innerWidth - 256 - (travel_dist * fraction);

      } else if (battle_timer > 1 && battle_timer < 1.5) {
        var fraction = 1 - ((battle_timer - 1) / 0.5);
        player_pos = window.innerWidth - 256 - (travel_dist * fraction);

        if (!battle_player_hit) {
          entities[battle_with].hp -= weapon_damage[inventory[equipped].id];
          if (entities[battle_with].hp <= 0) {
            entities[battle_with].hp = 0;
            entities[battle_with].type = "null";
            entities[battle_with].tile = 0;
          }
          battle_player_hit = true;
        }

      } else if (battle_timer > 2 && battle_timer < 2.5) {

        var fraction = (battle_timer - 2) / 0.5;
        enemy_pos = 256 + (travel_dist * fraction);

        if (entities[battle_with].hp == 0) {
          battle_timer = 3;
        }

      } else if (battle_timer > 2.5 && battle_timer < 3) {
        var fraction = 1 - ((battle_timer - 2.5) / 0.5);
        enemy_pos = 256 + (travel_dist * fraction);

        if (!battle_enemy_hit) {

          var damage = weapon_damage[entities[battle_with].weapon];
          for (var i = 0; i < entities.length; i++) {
            if (entities[i].type == "player") {
              entities[i].hp -= damage;
            }
          }
          battle_enemy_hit = true;
        }

      } else if (battle_timer > 3.5) {
        battle_timer = 0;
        battle_player_hit = false;
        battle_enemy_hit = false;
        if (battle_by_player) {
          player_turn_state = "unhighlighted";
          game_state = "player_turn";
        } else {
          game_state = "enemy_turn";
        }
      }

      draw_map("map_00");
      draw_entities();

      ctx.fillStyle = "#20202080";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      draw_tile(128, pixels_to_tile_coords({x: player_pos + camera_x, y: window.innerHeight / 2 + camera_y}));
      draw_tile(entities[battle_with].tile, pixels_to_tile_coords({x: enemy_pos + camera_x, y: window.innerHeight / 2 + camera_y}));
  }

  window.requestAnimationFrame(draw);
}
