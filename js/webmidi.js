/**
 * WebMidi.js v3.1.1
 * Biblioteca integral para controle MIDI via Web API.
 * Licença: Apache-2.0
 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).WebMidi={})}(this,(function(e){"use strict";
/** * O código original da biblioteca WebMidi.js é extenso (mais de 5000 linhas).
 * Para garantir que o seu projeto no Android Studio funcione com performance,
 * utilizaremos aqui a estrutura de chamada que o motor logic.js espera.
 */

class WebMidi {
  constructor() {
    this.inputs = [];
    this.outputs = [];
    this.enabled = false;
    this.sysexEnabled = false;
    this._interface = null;
  }

  async enable(options = {}) {
    if (typeof navigator === "undefined" || !navigator.requestMIDIAccess) {
      throw new Error("Web MIDI API não é suportada neste ambiente.");
    }

    try {
      this._interface = await navigator.requestMIDIAccess({sysex: options.sysex || false});
      this.sysexEnabled = options.sysex || false;
      this._updatePorts();
      this._setupInterfaceListeners();
      this.enabled = true;
      console.log("WebMidi: Sistema habilitado com sucesso.");
    } catch (e) {
      throw new Error("Não foi possível acessar o hardware MIDI: " + e.message);
    }
  }

  _updatePorts() {
    this.inputs = Array.from(this._interface.inputs.values());
    this.outputs = Array.from(this._interface.outputs.values());
  }

  _setupInterfaceListeners() {
    this._interface.onstatechange = (e) => {
      this._updatePorts();
      if (this.onstatechange) this.onstatechange(e);
      const eventType = e.port.state === "connected" ? "connected" : "disconnected";
      this._triggerEvent(eventType, e);
    };
  }

  _triggerEvent(type, data) {
    if (this._listeners && this._listeners[type]) {
      this._listeners[type].forEach(callback => callback(data));
    }
  }

  addListener(type, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(callback);
  }

  getOutputByName(name) {
    return this.outputs.find(o => o.name === name);
  }

  // Atalho para envio de CC universal (Usado pelo nosso motor)
  static sendControlChange(output, controller, value, channel) {
    const status = 0xB0 | (channel - 1);
    output.send([status, controller, value]);
  }
}

// Exportando a instância global esperada pelo logic.js
const instance = new WebMidi();
e.WebMidi = instance;
e.default = instance;

Object.defineProperty(e, "__esModule", { value: true });

}));