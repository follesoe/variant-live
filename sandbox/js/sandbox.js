import { transform } from "@babel/standalone";
import p5 from "p5";
import fs from "fs";

import "p5/lib/addons/p5.sound";
import "p5/lib/addons/p5.dom";

import editor from "./editor";
import createMusic from "./audio-player";

const example = fs.readFileSync(__dirname + "/example.template").toString();

var colorPalette = ["#000", "#03dac6", "#6200ee", "#ff0166", "#728d0d"];

let render = () => {};
let editorBox = editor(example, document.getElementById("editor"));
getSourceCode(editorBox, example, function replaceSource(fn) {
  render = fn;
});

function env(p) {
  function getDimensions() {
    return [p.windowWidth, p.windowHeight];
  }

  let mic, fft, analyzer, music;

  p.preload = () => {
    music = createMusic(p5);
  };

  p.setup = () => {
    p.createCanvas(...getDimensions().concat(p.WEBGL));

    // mic = new p5.AudioIn();
    // mic.start();

    fft = new p5.FFT();
    fft.setInput(music);

    analyzer = new p5.Amplitude();
  };

  p.windowResized = () => {
    p.resizeCanvas(...getDimensions());
  };

  p.draw = () => {
    p.background(colorPalette[0]);
    p.noFill();
    fft.analyze();

    var data = {
      bass: fft.getEnergy("bass"),
      treble: fft.getEnergy("treble"),
      mid: fft.getEnergy("mid"),
      level: analyzer.getLevel()
    };

    render(p, data);
  };
}
new p5(env, document.getElementById("canvas"));

function getSourceCode(editor, defaultCode, callback) {
  let process = val => callback(compile(removeExport(val)), val);

  editor.setValue(defaultCode);
  editor.onDidChangeModelContent(debounce(() => process(editor.getValue())));
  process(defaultCode);
}

function compile(src) {
  try {
    const res = transform(`window.__innerFunc = function __innerFunc() { 'use strict'; ${src} }`, {
      presets: ["es2015"]
    });
    eval(res.code);

    return __innerFunc();
  } catch (ex) {
    console.error("ERROR: ", ex.message);
  }
}

function removeExport(src) {
  let res = src.replace(/^export default/gm, "return ");
  return res;
}

function debounce(func, delay = 1000) {
  let inDebounce;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
}
