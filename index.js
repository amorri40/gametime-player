var JSZip, autosaver, chooser, createOverlay, draghint, error, load, loadData, loadSave, loading, localForage, menu, onkey, play, ref, retro, savechooser, settings, sparkmd5, utils, writeSave, xhr,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

sparkmd5 = require('sparkmd5');

JSZip = require('jszip');

localForage = require('localforage');

require('x-retro');

settings = require('./settings.json!');

utils = require('./utils');

draghint = document.getElementById('draghint');

loading = document.getElementById('loading');

if ((location.search != null) && location.search.substr(1)) {
  window.url = location.search.substr(1);
  if (window.url.startsWith('http')) {
    window.url = settings.urlPrefix + window.url;
  }
  ref = location.search.substr(1).split('/'), window.filename = ref[ref.length - 1];
}

if (window.url && window.filename) {
  xhr = new XMLHttpRequest();
  xhr.open('GET', window.url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    if (this.status === 200) {
      return loadData(window.filename, new Uint8Array(this.response));
    }
  };
  xhr.send();
} else {
  loading.classList.add('hidden');
  draghint.classList.remove('hidden');
}

if (navigator.serviceWorker) {
  navigator.serviceWorker.register('worker.js');
}

retro = null;

onkey = function(event) {
  var base, name, pressed;
  if (retro.player && settings.keys.hasOwnProperty(event.which)) {
    pressed = event.type === 'keydown';
    if ((base = retro.player.inputs[0].buttons)[name = settings.keys[event.which]] == null) {
      base[name] = {};
    }
    retro.player.inputs[0].buttons[settings.keys[event.which]].pressed = pressed;
    return event.preventDefault();
  }
};

autosaver = 0;

createOverlay = function(buttons, prefix) {
  return buttons.forEach(function(button) {
    var el, press;
    el = null;
    if (button.src) {
      el = document.createElement('img');
      el.setAttribute('src', prefix + button.src);
    } else {
      el = document.createElement('div');
    }
    el.style['z-index'] = 1;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.left = 100 * button.x + '%';
    el.style.top = 100 * button.y + '%';
    el.style.width = 100 * button.width + '%';
    el.style.height = 100 * button.height + '%';
    if (button.circle) {
      el.style['border-radius'] = '100%';
    }
    if (button.id != null) {
      el.style['z-index'] = 2;
      press = function(event) {
        var base, name;
        if (retro.player) {
          if ((base = retro.player.inputs[0].buttons)[name = button.id] == null) {
            base[name] = {};
          }
          retro.player.inputs[0].buttons[button.id].pressed = event.type === 'mousedown' || event.type === 'touchstart';
          return event.preventDefault();
        }
      };
      el.addEventListener('mousedown', press);
      el.addEventListener('mousemove', press);
      el.addEventListener('mouseup', press);
      el.addEventListener('touchstart', press);
      el.addEventListener('touchmove', press);
      el.addEventListener('touchend', press);
    }
    return document.getElementById('overlay').appendChild(el);
  });
};

error = function(e) {
  loading.classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  return console.error(e);
};

writeSave = function(retro) {
  var err;
  try {
    return localForage.setItem(retro.md5, new Uint8Array(retro.core.serialize()));
  } catch (_error) {
    err = _error;
    return error(err);
  }
};

loadSave = function(retro) {
  var err;
  try {
    return localForage.getItem(retro.md5);
  } catch (_error) {
    err = _error;
    return error(err);
  }
};

play = function(rom, extension) {
  return Promise.resolve().then(function() {
    if (!rom) {
      throw new Error('no rom!');
    }
    window.retro = retro = document.createElement('canvas', 'x-retro');
    document.body.children[0].appendChild(retro);
    retro.md5 = sparkmd5.ArrayBuffer.hash(rom);
    retro.name = settings.extensions[extension];
    return Promise.all([System["import"](settings.extensions[extension]), loadSave(retro), settings.overlays[retro.name] && indexOf.call(window, 'ontouchstart') >= 0 ? System["import"](settings.overlays[retro.name] + 'index.json!') : void 0]).then(function(arg) {
      var _overlay, core, save;
      core = arg[0], save = arg[1], _overlay = arg[2];
      if (_overlay != null) {
        createOverlay(_overlay, settings.overlays[retro.name]);
      }
      retro.core = core;
      retro.game = rom;
      if (save != null) {
        core.unserialize(new Uint8Array(save));
      }
      core.set_input_poll(function() {
        var gamepads;
        if (navigator.getGamepads) {
          gamepads = navigator.getGamepads();
        }
        if (gamepads && gamepads[0]) {
          return retro.player.inputs = gamepads;
        }
      });
      retro.player.inputs = [
        {
          buttons: {}
        }
      ];
      loading.classList.add('hidden');
      overlay.classList.remove('hidden');
      autosaver = setInterval(function() {
        return writeSave(retro);
      }, 1000);
      window.addEventListener('keydown', onkey);
      window.addEventListener('keyup', onkey);
      return retro.start();
    });
  });
};

loadData = function(filename, buffer) {
  var extension, file, i, len, ref1, rom, zip;
  draghint.classList.add('hidden');
  extension = utils.getExtension(filename);
  rom = null;
  if (extension === 'zip') {
    zip = new JSZip(buffer);
    ref1 = zip.file(/.*/);
    for (i = 0, len = ref1.length; i < len; i++) {
      file = ref1[i];
      extension = utils.getExtension(file.name);
      if (settings.extensions[extension]) {
        rom = new Uint8Array(file.asArrayBuffer());
        break;
      }
    }
  } else if (settings.extensions[extension]) {
    rom = buffer;
  }
  return play(rom, extension)["catch"](error);
};

load = function(file) {
  var reader;
  if (!file instanceof Blob) {
    return;
  }
  draghint.classList.add('hidden');
  reader = new FileReader();
  reader.addEventListener('load', function(event) {
    return loadData(file.name, new Uint8Array(reader.result));
  });
  return reader.readAsArrayBuffer(file);
};

window.addEventListener('drop', function(event) {
  if (draghint.classList.contains('hidden')) {
    return;
  }
  loading.classList.remove('hidden');
  event.preventDefault();
  draghint.classList.remove('hover');
  if (event.dataTransfer.files.length > 0) {
    load(event.dataTransfer.files[0]);
  }
  return false;
});

window.addEventListener('dragover', function(event) {
  event.preventDefault();
  draghint.classList.add('hover');
  return false;
});

window.addEventListener('dragleave', function(event) {
  event.preventDefault();
  draghint.classList.remove('hover');
  return false;
});

window.addEventListener('focus', function() {
  return draghint.classList.remove('hover');
});

menu = document.getElementById('menu');

window.addEventListener('contextmenu', function(event) {
  if (draghint.classList.contains('hidden' && (retro != null))) {
    if (retro.classList.contains('hidden')) {
      retro.start();
    } else {
      retro.stop();
    }
    retro.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
    menu.classList.toggle('hidden');
    return event.preventDefault();
  }
});

window.resume = function() {
  retro.classList.remove('hidden');
  overlay.classList.toggle('hidden');
  menu.classList.add('hidden');
  return retro.start();
};

document.getElementById('resume').addEventListener('click', window.resume);

window.reset = function() {
  retro.stop();
  retro.core.reset();
  return window.resume();
};

document.getElementById('reset').addEventListener('click', window.reset);

window.mute = function() {
  if (retro.player.destination.gain.value === 0) {
    retro.player.destination.gain.value = 1;
    document.getElementById('mute').textContent = 'mute';
  } else {
    retro.player.destination.gain.value = 0;
    document.getElementById('mute').textContent = 'unmute';
  }
  return window.resume();
};

document.getElementById('mute').addEventListener('click', window.mute);

window.save = function() {
  var a, blob, url;
  a = document.createElement('a');
  document.body.appendChild(a);
  a.classList.add('hidden');
  blob = new Blob([new Uint8Array(retro.core.serialize())], {
    type: 'application/octet-binary'
  });
  url = URL.createObjectURL(blob);
  a.href = url;
  a.download = retro.md5 + '.' + retro.name + '.sav';
  a.click();
  return URL.revokeObjectURL(url);
};

document.getElementById('save').addEventListener('click', window.save);

savechooser = document.getElementById('savechooser');

savechooser.addEventListener('change', function() {
  var file, reader;
  file = this.files[0];
  if (!file instanceof Blob) {
    return;
  }
  draghint.classList.add('hidden');
  reader = new FileReader();
  reader.addEventListener('load', function(event) {
    retro.core.unserialize(new Uint8Array(reader.result));
    return window.resume();
  });
  return reader.readAsArrayBuffer(file);
});

window.load = function() {
  return savechooser.click();
};

document.getElementById('load').addEventListener('click', window.load);

chooser = document.getElementById('chooser');

chooser.addEventListener('change', function() {
  draghint.classList.remove('hover');
  loading.classList.remove('hidden');
  return load(this.files[0]);
});

window.addEventListener('click', function(event) {
  if (!draghint.classList.contains('hidden')) {
    draghint.classList.add('hover');
    return chooser.click();
  }
});

window.addEventListener('touchstart', function(e) {
  return e.preventDefault();
});

window.addEventListener('error', error);

// ---
// generated by coffee-script 1.9.2