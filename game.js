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

var map;
var map_name;

var map_index = 0;

var map_order = [
  "map_00",
  "map_00"
]

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
    description: "Wet water. But of course, you can't swim."
  },
  {
    type: "water",
    name: "Water",
    description: "Wet water. But of course, you can't swim."
  },
  {
    type: "hedge_full",
    name: "Hedge",
    description: "A well-kept hedge. Can be chopped down with an axe equipped by choosing Interact."
  },
  {
    type: "capture_target",
    name: "Doorway",
    description: "A large, looming, omnipresent doorway. To capture, select Interact."
  },
  {
    type: "chest",
    name: "Chest",
    description: "A chest. Locked, of course. I hope it has something good inside. Choose Interact to open!"
  },
  {
    type: "wall",
    name: "Opened Chest",
    description: "An opened chest. Sorry, the excitement is over."
  },
  {
    type: "wood_wall",
    name: "Wooden Barricade",
    description: "A temporary wooden barricade. Can be burned by choosing Interact with Fire equipped."
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
  "iron_bow": 5,
  "steel_bow": 9,
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
    description: "An nasty enemy. Probably wants to kill you."
  },
};

var item_names = {
  back: "Back",
  iron_sword: "Iron Sword",
  iron_lance: "Iron Lance",
  iron_axe: "Iron Axe",
  steel_sword: "Steel Sword",
  steel_lance: "Steel Lance",
  steel_axe: "Steel Axe",
  fire: "Fire",
  thunder: "Thunder",
  wind: "Wind",
  hp_potion: "HP Potion"
}

var inventory = [
  {
    id: "iron_sword",
  },
  {
    id: "hp_potion",
  },
  {
    id: "steel_axe",
  },

]

var shop_items = [
  { id: "iron_lance", cost: 200 },
  { id: "iron_axe", cost: 300 },
  { id: "steel_sword", cost: 400 },
  { id: "steel_lance", cost: 300 },
  { id: "steel_axe", cost: 500 },
  { id: "fire", cost: 500 },
  { id: "thunder", cost: 400 },
  { id: "wind", cost: 300 },
  { id: "hp_potion", cost: 50 },
]

var equipped = 0;

var player_level = 1;
var player_xp = 0;
var player_cash = 500;

function calc_player_damage(victim) {

  var equipped_id = inventory[equipped].id;
  var damage = weapon_damage[equipped_id];

  switch (equipped_id) {
    case "iron_sword":
    case "steel_sword":
      damage -= victim.res_sword;
      break;
    case "iron_lance":
    case "steel_lance":
      damage -= victim.res_lance;
      break;
    case "iron_axe":
    case "steel_axe":
      damage -= victim.res_axe;
      break;
    case "fire":
      damage -= victim.res_fire;
      break;
    case "thunder":
      damage -= victim.res_thunder;
      break;
    case "wind":
      damage -= victim.res_wind;
      break;
  }

  return damage + player_level - 1;

}

var entities = []

function load_map(name) {
  map_name = map;
  map = maps[name];

  entities = [];

  for (var i = 0; i < map.layers[1].objects.length; i++) {
    var object = map.layers[1].objects[i];
    if (object.name == "player") {
      entities.push({
        type: "player",
        x: object.x / 16,
        y: object.y / 16,
        hp: 30 + player_level - 1,
        max_hp: 30 + player_level - 1,
        tile: 128,
      });
      use_inventory_item(equipped); // Set tile.
    } else if (object.name == "enemy") {
      var enemy = {
        type: "enemy",
        x: object.x / 16,
        y: object.y / 16,
      };
      for (var j = 0; j < object.properties.length; j++) {
        var property = object.properties[j];
        if (property.name == "hp") {
          enemy.hp = property.value;
          enemy.max_hp = property.value;
        } else if (property.name == "level") {
          enemy.level = property.value;
        } else if (property.name == "weapon") {
          enemy.weapon = property.value;
          switch (enemy.weapon) {
            case "iron_sword":
            case "steel_sword":
              enemy.tile = 144;
              break;
            case "iron_lance":
            case "steel_lance":
              enemy.tile = 145;
              break;
            case "iron_axe":
            case "steel_axe":
              enemy.tile = 146;
              break;
            case "fire":
              enemy.tile = 148;
              break;
            case "thunder":
              enemy.tile = 149;
              break;
            case "wind":
              enemy.tile = 150;
              break;
          }
        } else if (property.name == "res_sword") {
          enemy.res_sword = property.value;
        } else if (property.name == "res_lance") {
          enemy.res_lance = property.value;
        } else if (property.name == "res_axe") {
          enemy.res_axe = property.value;
        } else if (property.name == "res_fire") {
          enemy.res_fire = property.value;
        } else if (property.name == "res_thunder") {
          enemy.res_thunder = property.value;
        } else if (property.name == "res_wind") {
          enemy.res_wind = property.value;
        }
      }
      entities.push(enemy);
    }
  }
}

function get_player() {
  for (var i = 0; i < entities.length; i++) {
    if (entities[i].type == "player") {
      return entities[i];
    }
  }
}

function use_inventory_item(index) {

  var player = get_player();

  switch (inventory[index].id) {
    case "iron_sword":
    case "steel_sword":
      player.tile = 128
      equipped = index;
      break;

    case "iron_lance":
    case "steel_lance":
      player.tile = 129
      equipped = index;
      break;

    case "iron_axe":
    case "steel_axe":
      player.tile = 130
      equipped = index;
      break;

    case "fire":
      player.tile = 132
      equipped = index;
      break;
    case "thunder":
      player.tile = 133
      equipped = index;
      break;
    case "wind":
      player.tile = 134
      equipped = index;
      break;

    case "hp_potion":
      player.hp += 15;
      if (player.hp > player.max_hp) {
        player.hp = player.max_hp;
      }
      inventory.splice(index, 1);
      if (equipped > index) {
        equipped--;
      }
      break;
  }

}

function interact_with(x, y) {

  var width = map.width;
  var height = map.height;
  var data = map.layers[0].data;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false;
  }

  var index = y * width + x;

  switch (data[index]) {
    case 8:
      if (inventory[equipped].id == "iron_axe" || inventory[equipped].id == "steel_axe") {
        data[index] = 2;
        return true;
      }
      break;
    case 12:
      if (inventory[equipped].id == "fire") {
        data[index] = 5;
        return true;
      }
      break;
    case 9:
      game_state = "victory";
      return true;
      break;
  }

  return false;
}

function do_interact() {

  var player = get_player();

  if (interact_with(player.x, player.y + 1)) {
    return true;
  }
  if (interact_with(player.x + 1, player.y)) {
    return true;
  }
  if (interact_with(player.x, player.y - 1)) {
    return true;
  }
  if (interact_with(player.x - 1, player.y)) {
    return true;
  }

  return false;

}

// Game state.
var game_state = "title_screen"
var player_turn_state = "unhighlighted"; // unhighlighted, highlighted, action or inventory.
var player_prev_x = 0;
var player_prev_y = 0;
var player_move_target_x = 0;
var player_move_target_y = 0;
var player_move_origin_x = 0;
var player_move_origin_y = 0;
var player_move_timer = 0;
var enemy_turn_timer = 0;
var enemy_turn_moving = 0;
var enemy_move_target_x = 0;
var enemy_move_target_y = 0;
var enemy_move_origin_x = 0;
var enemy_move_origin_y = 0;
var battle_with = 0;
var battle_timer = 0;
var battle_by_player = false;
var battle_player_hit = false;
var battle_enemy_hit = false;
var turn_anim_timer = 0;
var victory_one_frame = false;

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

function draw_map() {
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
        if (entity.type == "player") {
          desc_text += " (HP: " + entity.hp + "/" + entity.max_hp + ", Level: " + player_level + ", XP: " + player_xp + "/100, Cash: " + player_cash + "G)";
        }
        if (entity.type == "enemy") {
          desc_text += " (HP: " + entity.hp + "/" + entity.max_hp + ", Level: " + entity.level + ", Res (S/L/A/F/T/W): " + entity.res_sword + "/" + entity.res_lance + "/" + entity.res_axe + "/" + entity.res_fire + "/" + entity.res_thunder + "/" + entity.res_wind  + ")";
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
        player_move_timer = 0;
        player_move_target_x = mouse_tile_x;
        player_move_target_y = mouse_tile_y;
        player_move_origin_x = entity.x;
        player_move_origin_y = entity.y;
        game_state = "player_move";

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
              if (do_interact()) {
                if (game_state != "victory") {
                  player_turn_state = "unhighlighted";
                  game_state = "enemy_turn_anim";
                }
              }
              break;
            case 2:
              player_turn_state = "inventory";
              break;
            case 3:
              player_turn_state = "unhighlighted";
              game_state = "enemy_turn_anim";
              break;
            case 4:
              player_turn_state = "unhighlighted";
              entity.x = player_prev_x;
              entity.y = player_prev_y;
              break;
          }
          
        }
      } else if (player_turn_state == "inventory") {
        if (e.clientX >= 64 && e.clientX <= 64 + 128 && e.clientY >= 64 && e.clientY <= 64 + 64 * (inventory.length + 1)) {
          var index = Math.floor((e.clientY - 64) / 64);
          if (index == 0) {
            player_turn_state = "action";
          } else {
            use_inventory_item(index - 1);
            player_turn_state = "unhighlighted";
            game_state = "enemy_turn_anim";
          }
        }
      }
    }
  }

  if (game_state == "title_screen") {
    load_map("map_00");
    game_state = "player_turn_anim";
  } else if (game_state == "game_over") {
    load_map(map_order[map_index]);
    game_state = "player_turn_anim";
  } else if (game_state == "victory" && victory_one_frame) {
    victory_one_frame = false;
    game_state = "shop";
  } else if (game_state == "shop") {
    if (e.clientX >= 64 && e.clientX <= 64 + 256 && e.clientY >= 64 && e.clientY <= 64 + 64 * (shop_items.length + 1)) {
      var index = Math.floor((e.clientY - 64) / 64);

      var item = shop_items[index];

      if (player_cash >= item.cost && inventory.length < 8) {
        player_cash -= item.cost;
        inventory.push({id:item.id});
      }

    } else if (e.clientX >= 512 && e.clientX <= 512 + 256 && e.clientY >= 64 + 5 * 64 && e.clientY <= 64 + 5 * 64 + 128) {
      map_index++;
      load_map(map_order[map_index]);
      player_turn_state = "unhighlighted";
      game_state = "player_turn_anim";
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

    case "title_screen":

      ctx.font = "96px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("All Of Your Friends Are Dead", window.innerWidth / 2, window.innerHeight / 2 - 48);
      ctx.textAlign = "left";

      ctx.font = "48px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Click to Begin", window.innerWidth / 2, window.innerHeight / 2 + 48);
      ctx.textAlign = "left";

      break;

    case "game_over":

      ctx.font = "96px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Game Over", window.innerWidth / 2, window.innerHeight / 2 - 48);
      ctx.textAlign = "left";

      ctx.font = "48px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Click to Restart", window.innerWidth / 2, window.innerHeight / 2 + 48);
      ctx.textAlign = "left";

      break;

    case "victory":

      victory_one_frame = true;

      ctx.font = "96px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Victory!", window.innerWidth / 2, window.innerHeight / 2 - 48);
      ctx.textAlign = "left";

      ctx.font = "48px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Click to Proceed", window.innerWidth / 2, window.innerHeight / 2 + 48);
      ctx.textAlign = "left";

      break;

    case "shop":

      ctx.font = "96px sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Shop", window.innerWidth / 2, 100);
      ctx.textAlign = "left";

      for (var i = 0; i < shop_items.length; i++) {
        ctx.fillStyle = "#40404080";
        ctx.fillRect(64 + 1, 64 + i * 64 + 1, 256 - 2, 64 - 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px sans";
        ctx.fillText(item_names[shop_items[i].id] + ": " + shop_items[i].cost + "G", 64 + 8, 64 + i * 64 + 32 + 8);
      }

      for (var i = 0; i < inventory.length + 4; i++) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px sans";
        if (i == 0) {
          ctx.fillText("Cash: " + player_cash  + "G", 512, 128 + i * 18);
        } else if (i == 1) {

        } else if (i == 2) {
          ctx.fillText("Inventory (" + inventory.length + "/8):", 512, 128 + i * 18);
        } else if (i == 3) {

        } else {
          ctx.fillText(item_names[inventory[i - 4].id], 512, 128 + i * 18);
        }
      }

        ctx.fillStyle = "#40404080";
        ctx.fillRect(512 + 1, 64 + 5 * 64 + 1, 256 - 2, 64 - 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px sans";
        ctx.fillText("Next Battle", 512 + 8, 64 + 5 * 64 + 32 + 8);

      break;

    case "player_turn_anim":

      turn_anim_timer += dt;

      draw_map("map_00");
      draw_entities();

      if (turn_anim_timer > 1) {
        turn_anim_timer = 0;
        player_turn_state = "unhighlighted";
        game_state = "player_turn";
      } else {

        var fraction = 1;
        if (turn_anim_timer > 0.75) {
          fraction = 1 - (turn_anim_timer - 0.75) / 0.25;
        } else if (turn_anim_timer < 0.25) {
          fraction =  turn_anim_timer / 0.25;
        }

        ctx.font = "96px sans";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(64, 64, 255, " + fraction + ")";
        ctx.strokeStyle = "rgba(0, 0, 255, " + fraction + ")";
        ctx.lineWidth = 3;
        ctx.fillText("Player Turn", window.innerWidth / 2, window.innerHeight / 2 + 48);
        ctx.strokeText("Player Turn", window.innerWidth / 2, window.innerHeight / 2 + 48);
        ctx.textAlign = "left";
      }

      break;

    case "enemy_turn_anim":

      turn_anim_timer += dt;

      draw_map("map_00");
      draw_entities();

      if (turn_anim_timer > 1) {
        turn_anim_timer = 0;
        game_state = "enemy_turn";
      } else {

        var fraction = 1;
        if (turn_anim_timer > 0.75) {
          fraction = 1 - (turn_anim_timer - 0.75) / 0.25;
        } else if (turn_anim_timer < 0.25) {
          fraction =  turn_anim_timer / 0.25;
        }

        ctx.font = "96px sans";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 64, 0, " + fraction + ")";
        ctx.strokeStyle = "rgba(255, 0, 0, " + fraction + ")";
        ctx.lineWidth = 3;
        ctx.fillText("Enemy Turn", window.innerWidth / 2, window.innerHeight / 2 + 48);
        ctx.strokeText("Enemy Turn", window.innerWidth / 2, window.innerHeight / 2 + 48);
        ctx.textAlign = "left";
      }

      break;

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
      } else if (player_turn_state == "inventory") {
        for (var i = 0; i < inventory.length + 1; i++) {

          var item = i == 0 ? {id: "back"} : inventory[i - 1];

          ctx.fillStyle = "#40404080";
          ctx.fillRect(64 + 1, 64 + i * 64 + 1, 128 - 2, 64 - 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "16px sans";
          ctx.fillText(item_names[item.id], 64 + 8, 64 + i * 64 + 32 + 8);
        }
      }
      break;

    case "player_move":

      player_move_timer += dt;

      for (var i = 0; i < entities.length; i++) {
        if (entities[i].type == "player") {
          var entity = entities[i];
            if (player_move_timer > 0.5) {
      
              entity.x = player_move_target_x;
              entity.y = player_move_target_y;
              player_turn_state = "action";
              game_state = "player_turn";
      
            } else {
            
              var fraction = player_move_timer / 0.5;
              entity.x = player_move_origin_x + (player_move_target_x - player_move_origin_x) * fraction;
              entity.y = player_move_origin_y + (player_move_target_y - player_move_origin_y) * fraction;
      
            }
        }
      }

      draw_map("map_00");
      draw_entities();
      draw_ui();
      break;

    case "enemy_turn":

      enemy_turn_timer += dt;

      if (enemy_turn_timer > 0.5) {

        while (entities.length != enemy_turn_moving && entities[enemy_turn_moving].type != "enemy") {
          enemy_turn_moving++;
        }
  
        if (entities.length <= enemy_turn_moving) {
          enemy_turn_moving = 0;
          player_turn_state = "unhighlighted";
          game_state = "player_turn_anim";
          draw_map("map_00");
          draw_entities();
          draw_ui();
          break;
        }

        // Move the enemy.
        var width = map.width;
        var height = map.height;
        var data = map.layers[0].data;

        var player_x = 0;
        var player_y = 0;
        var move_to_x = -1;
        var move_to_y = -1;
        var move_to_distance = 10000000000000;

        for (var i = 0; i < entities.length; i++) {
          if (entities[i].type == "player") {
            player_x = entities[i].x;
            player_y = entities[i].y;
          }
        }

        for (var x = 0; x < width; x++) {
          for (var y = 0; y < height; y++) {
            if (is_movable_to(entities[enemy_turn_moving].x, entities[enemy_turn_moving].y, 5, x, y)) {
              var dist = (player_x - x)**2 + (player_y - y)**2;
              if (dist < move_to_distance) {
                move_to_x = x;
                move_to_y = y;
                move_to_distance = dist;
              }
            }
          }
        }

        enemy_move_target_x = move_to_x;
        enemy_move_target_y = move_to_y;

        enemy_move_origin_x = entities[enemy_turn_moving].x;
        enemy_move_origin_y = entities[enemy_turn_moving].y;

        game_state = "enemy_move";

      }

      draw_map("map_00");
      draw_entities();
      draw_ui();
      break;

    case "enemy_move":

      enemy_turn_timer += dt;

      if (enemy_turn_timer > 1) {
        entities[enemy_turn_moving].x = enemy_move_target_x;
        entities[enemy_turn_moving].y = enemy_move_target_y;

        var player_x = 0;
        var player_y = 0;

        for (var i = 0; i < entities.length; i++) {
          if (entities[i].type == "player") {
            player_x = entities[i].x;
            player_y = entities[i].y;
          }
        }

        if ((enemy_move_target_x == player_x + 1 && enemy_move_target_y == player_y) || (enemy_move_target_x == player_x - 1 && enemy_move_target_y == player_y) || (enemy_move_target_x == player_x && enemy_move_target_y == player_y + 1) || (enemy_move_target_x == player_x && enemy_move_target_y == player_y - 1)) {
          battle_with = enemy_turn_moving;
          battle_by_player = false;
          game_state = "battle";
        } else {
          game_state = "enemy_turn";
        }

        enemy_turn_timer = 0;

        enemy_turn_moving++;
      } else {

        var fraction = (enemy_turn_timer - 0.5) / 0.5;
        entities[enemy_turn_moving].x = enemy_move_origin_x + (enemy_move_target_x - enemy_move_origin_x) * fraction;
        entities[enemy_turn_moving].y = enemy_move_origin_y + (enemy_move_target_y - enemy_move_origin_y) * fraction;

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

      function player_move_1(t) {
        var fraction = (battle_timer - t) / 0.5;
        player_pos = window.innerWidth - 256 - (travel_dist * fraction);
      }

      function player_move_2(t) {
        var fraction = 1 - ((battle_timer - t) / 0.5);
        player_pos = window.innerWidth - 256 - (travel_dist * fraction);

        if (!battle_player_hit) {
          entities[battle_with].hp -= calc_player_damage(entities[battle_with]);
          if (entities[battle_with].hp <= 0) {
            entities[battle_with].hp = 0;
            entities[battle_with].type = "null";
            entities[battle_with].tile = 0;

            var level_diff = entities[battle_with].level - player_level
            if (level_diff < 0) { level_diff = 0; }
            player_xp += 20 + (level_diff * 10);
            player_cash += 50 + (level_diff * 20);
            while (player_xp >= 100) {
              player_xp -= 100;
              player_level++;
              var player = get_player();
              player.hp++;
              player.max_hp++;
            }

          }
          battle_player_hit = true;
        }
      }

      function enemy_move_1(t) {
        var fraction = (battle_timer - t) / 0.5;
        enemy_pos = 256 + (travel_dist * fraction);

        if (entities[battle_with].hp == 0) {
          battle_timer = 3;
        }
      }

      function enemy_move_2(t) {
        var fraction = 1 - ((battle_timer - t) / 0.5);
        enemy_pos = 256 + (travel_dist * fraction);

        if (!battle_enemy_hit) {

          var damage = weapon_damage[entities[battle_with].weapon];

          var player = get_player();
          player.hp -= damage;

          if (player.hp <= 0) {
            player.hp = 0;
            player_turn_state = "unhighlighted";
            game_state = "game_over";
          }

          battle_enemy_hit = true;
        }
      }

      if (battle_timer > 0.5 && battle_timer < 1) {
        if (battle_by_player) {
          player_move_1(0.5);
        } else {
          enemy_move_1(0.5);
        }
      } else if (battle_timer > 1 && battle_timer < 1.5) {
        if (battle_by_player) {
          player_move_2(1);
        } else {
          enemy_move_2(1);
        }
      } else if (battle_timer > 2 && battle_timer < 2.5) {
        if (battle_by_player) {
          enemy_move_1(2);
        } else {
          player_move_1(2);
        }
      } else if (battle_timer > 2.5 && battle_timer < 3) {
        if (battle_by_player) {
          enemy_move_2(2.5);
        } else {
          player_move_2(2.5);
        }
      } else if (battle_timer > 3.5) {
        battle_timer = 0;
        battle_player_hit = false;
        battle_enemy_hit = false;
        if (battle_by_player) {
          player_turn_state = "unhighlighted";
          game_state = "enemy_turn_anim";
        } else {
          game_state = "enemy_turn";
        }
      }

      draw_map();
      draw_entities();

      ctx.fillStyle = "#20202080";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      draw_tile(get_player().tile, pixels_to_tile_coords({x: player_pos + camera_x, y: window.innerHeight / 2 + camera_y}));
      draw_tile(entities[battle_with].tile, pixels_to_tile_coords({x: enemy_pos + camera_x, y: window.innerHeight / 2 + camera_y}));

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "16px sans";
      ctx.fillText("HP: " + entities[battle_with].hp, 256, 256);
      for (var i = 0; i < entities.length; i++) {
        if (entities[i].type == "player") {
          ctx.fillText("HP: " + entities[i].hp, window.innerWidth - 256, 256);
        }
      }
  }

  window.requestAnimationFrame(draw);
}
